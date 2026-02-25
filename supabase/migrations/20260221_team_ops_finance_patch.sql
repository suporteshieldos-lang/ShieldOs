-- Team + Operations + Finance patch (idempotent)

create extension if not exists pgcrypto;

-- 1) Users hardening for team module
alter table public.users add column if not exists email text;
alter table public.users add column if not exists role text;
alter table public.users add column if not exists ativo boolean default true;

update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and (u.email is null or u.email = '');

update public.users
set role = case
  when role = 'master_admin' then 'master_admin'
  when role_system = 'super_admin' then 'master_admin'
  when role_base = 'admin' then 'admin'
  else 'tecnico'
end
where role is null;

-- 2) Customers table + anti-dup (same name + same phone inside company)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  telefone text not null,
  email text,
  cpf text,
  normalized_nome text generated always as (lower(trim(nome))) stored,
  normalized_telefone text generated always as (regexp_replace(coalesce(telefone, ''), '\D', '', 'g')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_customers_company_nome_telefone
  on public.customers (company_id, normalized_nome, normalized_telefone);

-- fallback default customer
insert into public.customers (company_id, nome, telefone, email)
select c.id, 'Nao Identificado', '00000000000', null
from public.companies c
where not exists (
  select 1
  from public.customers x
  where x.company_id = c.id
    and x.normalized_nome = 'nao identificado'
    and x.normalized_telefone = '00000000000'
);

-- 3) Service orders enrichment
alter table public.service_orders add column if not exists customer_id uuid references public.customers(id);
alter table public.service_orders add column if not exists updated_by uuid references public.users(id);

-- 4) Customer auto-upsert by order fields
create or replace function public.upsert_customer_by_name_phone(
  p_company_id uuid,
  p_nome text,
  p_telefone text,
  p_email text default null,
  p_cpf text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_nome is null or btrim(p_nome) = '' or p_telefone is null or btrim(p_telefone) = '' then
    return null;
  end if;

  insert into public.customers(company_id, nome, telefone, email, cpf)
  values (p_company_id, p_nome, p_telefone, nullif(p_email, ''), nullif(p_cpf, ''))
  on conflict (company_id, normalized_nome, normalized_telefone)
  do update set
    email = coalesce(excluded.email, public.customers.email),
    cpf = coalesce(excluded.cpf, public.customers.cpf),
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sync_order_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then
    new.customer_id := public.upsert_customer_by_name_phone(
      new.company_id,
      coalesce(new.customer_name, ''),
      coalesce(new.customer_phone, ''),
      null,
      null
    );
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_sync_order_customer on public.service_orders;
create trigger trg_sync_order_customer
before insert or update on public.service_orders
for each row execute function public.sync_order_customer();

-- 5) Team audit
create table if not exists public.team_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  action text not null,
  target_user_id uuid references public.users(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.log_team_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_company_id := new.company_id;
    v_action := 'create_user';
  elsif tg_op = 'UPDATE' then
    v_company_id := new.company_id;
    if old.role is distinct from new.role then
      v_action := 'change_role';
    elsif old.ativo is distinct from new.ativo then
      v_action := case when new.ativo then 'activate_user' else 'deactivate_user' end;
    else
      v_action := 'update_user';
    end if;
  else
    v_company_id := old.company_id;
    v_action := 'delete_user';
  end if;

  insert into public.team_audit_logs(company_id, action, target_user_id, actor_user_id, old_data, new_data)
  values (
    v_company_id,
    v_action,
    coalesce(new.id, old.id),
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_team_audit_users on public.users;
create trigger trg_team_audit_users
after insert or update or delete on public.users
for each row execute function public.log_team_changes();

-- 6) Fine-grained order access by role
create or replace function public.can_access_order_row(p_company_id uuid, p_technician_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if public.is_super_admin() then
    return true;
  end if;

  if not public.can_access_company(p_company_id) then
    return false;
  end if;

  select role into v_role
  from public.users
  where id = auth.uid()
  limit 1;

  if v_role in ('admin', 'atendente') then
    return true;
  end if;

  if v_role = 'tecnico' then
    return p_technician_id = auth.uid();
  end if;

  return false;
end;
$$;

drop policy if exists so_select on public.service_orders;
create policy so_select on public.service_orders
for select to authenticated
using (public.can_access_order_row(company_id, technician_id));

drop policy if exists so_insert on public.service_orders;
create policy so_insert on public.service_orders
for insert to authenticated
with check (
  public.can_access_company(company_id)
  and public.has_permission('edit_status', company_id)
);

drop policy if exists so_update on public.service_orders;
create policy so_update on public.service_orders
for update to authenticated
using (public.can_access_order_row(company_id, technician_id))
with check (public.can_access_order_row(company_id, technician_id));

-- 7) RLS for new tables
alter table public.customers enable row level security;
alter table public.team_audit_logs enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers
for all to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

drop policy if exists team_audit_select on public.team_audit_logs;
create policy team_audit_select on public.team_audit_logs
for select to authenticated
using (
  public.is_super_admin()
  or public.can_manage_company_users(company_id)
);

-- 8) Grants
grant execute on function public.upsert_customer_by_name_phone(uuid, text, text, text, text) to authenticated;
grant execute on function public.can_access_order_row(uuid, uuid) to authenticated;
