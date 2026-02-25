-- Cash hardening: transactional entries + audit trail + secure RPCs

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_movement_type') then
    create type public.cash_movement_type as enum (
      'entrada_manual',
      'entrada_os',
      'saida_operacional',
      'consumo_peca',
      'retirada_sangria',
      'ajuste_caixa'
    );
  end if;
end $$;

create table if not exists public.cash_entries_tx (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.users(id),
  type text not null check (type in ('entrada', 'saida')),
  movement_type public.cash_movement_type not null,
  category text,
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  payment_method text check (payment_method in ('dinheiro', 'pix', 'cartao', 'outro')),
  order_id uuid references public.service_orders(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cash_entry_id uuid references public.cash_entries_tx(id) on delete set null,
  action text not null,
  actor_user_id uuid references public.users(id),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_entries_tx_company_created on public.cash_entries_tx(company_id, created_at desc);
create index if not exists idx_cash_entries_tx_order on public.cash_entries_tx(order_id);
create index if not exists idx_cash_audit_logs_company_created on public.cash_audit_logs(company_id, created_at desc);

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.ativo
        and u.company_id = p_company_id
        and (u.role_base = 'admin' or u.role = 'admin')
    )
$$;

create or replace function public.cash_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.cash_write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if tg_op = 'DELETE' then
    v_company_id := old.company_id;
  else
    v_company_id := new.company_id;
  end if;

  insert into public.cash_audit_logs (
    company_id, cash_entry_id, action, actor_user_id, before_data, after_data
  )
  values (
    v_company_id,
    case when tg_op = 'DELETE' then old.id else new.id end,
    lower(tg_op),
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.create_cash_manual_entry(
  p_category text,
  p_description text,
  p_amount_cents integer,
  p_payment_method text,
  p_order_id uuid default null,
  p_notes text default null
)
returns public.cash_entries_tx
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_type text := 'entrada';
  v_movement_type public.cash_movement_type := 'entrada_manual';
  v_order_total_cents integer := 0;
  v_received_cents integer := 0;
  v_row public.cash_entries_tx;
begin
  v_company_id := public.current_user_company_id();
  if v_company_id is null then
    raise exception 'Empresa do usuario nao identificada.';
  end if;
  if not public.can_access_company(v_company_id) then
    raise exception 'Acesso negado.';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Valor deve ser maior que zero.';
  end if;
  if p_category is null or btrim(p_category) = '' then
    raise exception 'Categoria obrigatoria.';
  end if;
  if p_category = 'Ajuste' then
    raise exception 'Use o fluxo de ajuste de caixa para correcoes.';
  end if;
  if p_category = 'Outro' and (p_description is null or length(btrim(p_description)) < 10) then
    raise exception 'Descricao do motivo deve ter no minimo 10 caracteres.';
  end if;
  if p_payment_method is not null and p_payment_method not in ('dinheiro', 'pix', 'cartao', 'outro') then
    raise exception 'Forma de pagamento invalida.';
  end if;

  if p_category = 'Recebimento de OS' then
    if p_order_id is null then
      raise exception 'OS obrigatoria para recebimento de OS.';
    end if;

    select ((coalesce(total_valor, 0) - coalesce(valor_pago, 0)) * 100)::integer
      into v_order_total_cents
    from public.service_orders
    where id = p_order_id and company_id = v_company_id;

    if v_order_total_cents is null then
      raise exception 'OS nao encontrada.';
    end if;

    select coalesce(sum(amount_cents), 0)
      into v_received_cents
    from public.cash_entries_tx
    where company_id = v_company_id
      and order_id = p_order_id
      and type = 'entrada'
      and movement_type = 'entrada_os';

    if v_received_cents >= v_order_total_cents then
      raise exception 'Esta OS ja foi totalmente recebida.';
    end if;

    if (v_received_cents + p_amount_cents) > v_order_total_cents then
      raise exception 'Valor excede o restante da OS.';
    end if;

    v_movement_type := 'entrada_os';
  end if;

  insert into public.cash_entries_tx (
    company_id, user_id, type, movement_type, category, description, amount_cents, payment_method, order_id, notes
  )
  values (
    v_company_id, auth.uid(), v_type, v_movement_type, p_category, coalesce(nullif(btrim(p_description), ''), p_category), p_amount_cents,
    p_payment_method, p_order_id, p_notes
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_cash_adjustment(
  p_adjust_type text,
  p_reason_type text,
  p_observation text,
  p_amount_cents integer
)
returns public.cash_entries_tx
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_row public.cash_entries_tx;
  v_type text;
begin
  v_company_id := public.current_user_company_id();
  if v_company_id is null then
    raise exception 'Empresa do usuario nao identificada.';
  end if;
  if not public.is_company_admin(v_company_id) then
    raise exception 'Apenas administradores podem ajustar o caixa.';
  end if;

  if p_adjust_type not in ('entrada', 'saida') then
    raise exception 'Tipo de ajuste invalido.';
  end if;
  if p_reason_type not in ('sobra_caixa', 'quebra_caixa', 'erro_lancamento', 'ajuste_manual') then
    raise exception 'Motivo do ajuste invalido.';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Valor do ajuste deve ser maior que zero.';
  end if;
  if p_observation is null or length(btrim(p_observation)) < 10 then
    raise exception 'Observacao deve ter no minimo 10 caracteres.';
  end if;

  v_type := p_adjust_type;

  insert into public.cash_entries_tx (
    company_id, user_id, type, movement_type, category, description, amount_cents, payment_method, notes
  )
  values (
    v_company_id,
    auth.uid(),
    v_type,
    'ajuste_caixa',
    'Ajuste',
    'Ajuste de caixa',
    p_amount_cents,
    null,
    jsonb_build_object(
      'reason_type', p_reason_type,
      'observation', p_observation
    )::text
  )
  returning * into v_row;

  return v_row;
end;
$$;

alter table public.cash_entries_tx enable row level security;
alter table public.cash_audit_logs enable row level security;

drop policy if exists cash_entries_tx_select on public.cash_entries_tx;
create policy cash_entries_tx_select on public.cash_entries_tx
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists cash_entries_tx_insert on public.cash_entries_tx;
create policy cash_entries_tx_insert on public.cash_entries_tx
for insert to authenticated
with check (public.can_access_company(company_id));

drop policy if exists cash_entries_tx_update on public.cash_entries_tx;
create policy cash_entries_tx_update on public.cash_entries_tx
for update to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

drop policy if exists cash_entries_tx_delete on public.cash_entries_tx;
create policy cash_entries_tx_delete on public.cash_entries_tx
for delete to authenticated
using (public.can_access_company(company_id));

drop policy if exists cash_audit_logs_select on public.cash_audit_logs;
create policy cash_audit_logs_select on public.cash_audit_logs
for select to authenticated
using (public.can_access_company(company_id));

drop trigger if exists trg_cash_entries_tx_updated_at on public.cash_entries_tx;
create trigger trg_cash_entries_tx_updated_at
before update on public.cash_entries_tx
for each row execute function public.cash_set_updated_at();

drop trigger if exists trg_cash_entries_tx_audit on public.cash_entries_tx;
create trigger trg_cash_entries_tx_audit
after insert or update or delete on public.cash_entries_tx
for each row execute function public.cash_write_audit();

grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.create_cash_manual_entry(text, text, integer, text, uuid, text) to authenticated;
grant execute on function public.create_cash_adjustment(text, text, text, integer) to authenticated;
