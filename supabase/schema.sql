-- =====================================================
-- Multi-tenant SaaS schema (single plan: ELITE)
-- Supabase Postgres + Auth + RLS
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1) Enums
-- =====================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('ativa', 'bloqueada', 'cancelada');
  end if;
  if not exists (select 1 from pg_type where typname = 'role_base_type') then
    create type public.role_base_type as enum ('admin', 'operador');
  end if;
  if not exists (select 1 from pg_type where typname = 'role_system_type') then
    create type public.role_system_type as enum ('company_user', 'super_admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'finance_type') then
    create type public.finance_type as enum ('receita', 'custo');
  end if;
end $$;

-- =====================================================
-- 2) Core tables
-- =====================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  nome_empresa text not null,
  email_principal text,
  plano text not null default 'elite',
  status_assinatura public.subscription_status not null default 'ativa',
  vencimento timestamptz,
  kiwify_customer_id text,
  data_expiracao timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  nome text not null,
  email text,
  role text,
  role_base public.role_base_type not null default 'operador',
  role_system public.role_system_type not null default 'company_user',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint users_company_required check (
    role_system = 'super_admin' or company_id is not null
  )
);

alter table if exists public.companies add column if not exists email_principal text;
alter table if exists public.companies add column if not exists plano text not null default 'elite';
alter table if exists public.companies add column if not exists vencimento timestamptz;
alter table if exists public.companies add column if not exists kiwify_customer_id text;

alter table if exists public.users add column if not exists email text;
alter table if exists public.users add column if not exists role text;

update public.users
set role = case
  when role_system = 'super_admin' then 'master_admin'
  when role_base = 'admin' then 'admin'
  else 'tecnico'
end
where role is null;

create table if not exists public.permissions (
  id bigint generated always as identity primary key,
  key text unique not null
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  allowed boolean not null default false,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- Existing app state store (if app stores JSON state)
create table if not exists public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Compatibility patch for legacy table (old app_states without company_id)
alter table if exists public.app_states
  add column if not exists company_id uuid;

-- Best effort backfill from public.users when possible
update public.app_states a
set company_id = u.company_id
from public.users u
where a.user_id = u.id
  and a.company_id is null
  and u.company_id is not null;

-- =====================================================
-- 3) Business tables (all with company_id)
-- =====================================================

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_name text not null,
  status text not null default 'recebida',
  total_valor numeric(12,2) not null default 0,
  valor_pago numeric(12,2) not null default 0,
  technician_id uuid references public.users(id),
  assinatura_cliente text,
  data_retirada timestamptz,
  ip_registro inet,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.os_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  os_id uuid not null references public.service_orders(id) on delete cascade,
  usuario_id uuid references public.users(id),
  acao text not null,
  valor_anterior jsonb,
  valor_novo jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.movimentacoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tipo public.finance_type not null,
  valor numeric(12,2) not null check (valor >= 0),
  categoria text not null,
  os_id uuid references public.service_orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tabela_afetada text not null,
  registro_id text not null,
  usuario_id uuid references public.users(id),
  acao text not null,
  dados_antigos jsonb,
  dados_novos jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_dispatch_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  os_id uuid not null references public.service_orders(id) on delete cascade,
  trigger_status text not null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================
-- 4) Seeds
-- =====================================================

insert into public.permissions(key)
values
  ('view_financial'),
  ('edit_status'),
  ('export_reports'),
  ('manage_users'),
  ('delete_os')
on conflict (key) do nothing;

-- =====================================================
-- 5) Helper functions
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.company_id
  from public.users u
  where u.id = auth.uid() and u.ativo
  limit 1
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.ativo
      and (u.role_system = 'super_admin' or u.role = 'master_admin')
  )
$$;

create or replace function public.is_company_active(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.status_assinatura = 'ativa'
      and (
        coalesce(c.vencimento, c.data_expiracao) is null
        or coalesce(c.vencimento, c.data_expiracao) >= now()
      )
  )
$$;

create or replace function public.can_access_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (
      p_company_id = public.current_user_company_id()
      and public.is_company_active(p_company_id)
    )
$$;

create or replace function public.can_manage_company_users(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists(
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.ativo
        and u.company_id = p_company_id
        and u.role_base = 'admin'
        and u.role_system = 'company_user'
    )
$$;

create or replace function public.has_permission(p_permission_key text, p_company_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role public.role_base_type;
begin
  if public.is_super_admin() then
    return true;
  end if;

  v_company_id := coalesce(p_company_id, public.current_user_company_id());
  if v_company_id is null or not public.can_access_company(v_company_id) then
    return false;
  end if;

  select u.role_base into v_role
  from public.users u
  where u.id = auth.uid() and u.company_id = v_company_id and u.ativo
  limit 1;

  if v_role = 'admin' then
    return true;
  end if;

  return exists(
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()
      and up.company_id = v_company_id
      and up.permission_key = p_permission_key
      and up.allowed
  );
end;
$$;

create or replace function public.assert_user_permission(p_permission_key text, p_company_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(p_permission_key, p_company_id) then
    raise exception 'Permissao negada para a acao %', p_permission_key;
  end if;
end;
$$;

-- Login/access guard for monthly subscription
-- Call this right after login in backend/frontend session boot.
create or replace function public.can_current_user_login()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when public.is_super_admin() then true
      else public.is_company_active(public.current_user_company_id())
    end
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_nome text;
  v_role text;
  v_role_base public.role_base_type;
  v_role_system public.role_system_type;
begin
  v_nome := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));
  v_role := coalesce(new.raw_user_meta_data->>'role', 'tecnico');

  if v_role = 'master_admin' then
    v_company_id := null;
    v_role_base := 'admin';
    v_role_system := 'super_admin';
  else
    if new.raw_user_meta_data ? 'company_id' then
      v_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
    else
      v_company_id := null;
    end if;

    if v_role = 'admin' then
      v_role_base := 'admin';
    else
      v_role_base := 'operador';
    end if;
    v_role_system := 'company_user';
  end if;

  insert into public.users (id, company_id, nome, email, role, role_base, role_system, ativo)
  values (new.id, v_company_id, v_nome, new.email, v_role, v_role_base, v_role_system, true)
  on conflict (id) do update
    set email = excluded.email,
        nome = excluded.nome,
        role = excluded.role,
        role_base = excluded.role_base,
        role_system = excluded.role_system;

  return new;
end;
$$;

-- Manual subscription update (SUPER_ADMIN only)
create or replace function public.super_admin_update_company_subscription(
  p_company_id uuid,
  p_status public.subscription_status,
  p_data_expiracao timestamptz,
  p_vencimento timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Somente super_admin pode alterar assinatura.';
  end if;

  update public.companies
  set status_assinatura = p_status,
      data_expiracao = p_data_expiracao,
      vencimento = coalesce(p_vencimento, p_data_expiracao)
  where id = p_company_id;
end;
$$;

create or replace function public.master_update_company(
  p_company_id uuid,
  p_status public.subscription_status,
  p_vencimento timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Somente master_admin.';
  end if;

  update public.companies
     set status_assinatura = p_status,
         vencimento = p_vencimento,
         data_expiracao = p_vencimento
   where id = p_company_id;
end;
$$;

-- =====================================================
-- 6) Timeline + alerts + audit triggers
-- =====================================================

create or replace function public.log_service_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status then
      insert into public.os_logs(company_id, os_id, usuario_id, acao, valor_anterior, valor_novo)
      values (new.company_id, new.id, auth.uid(), 'mudanca_status',
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status));
    end if;

    if old.total_valor is distinct from new.total_valor then
      insert into public.os_logs(company_id, os_id, usuario_id, acao, valor_anterior, valor_novo)
      values (new.company_id, new.id, auth.uid(), 'alteracao_valor',
        jsonb_build_object('total_valor', old.total_valor),
        jsonb_build_object('total_valor', new.total_valor));
    end if;

    if old.technician_id is distinct from new.technician_id then
      insert into public.os_logs(company_id, os_id, usuario_id, acao, valor_anterior, valor_novo)
      values (new.company_id, new.id, auth.uid(), 'mudanca_tecnico',
        jsonb_build_object('technician_id', old.technician_id),
        jsonb_build_object('technician_id', new.technician_id));
    end if;

    if old.status is distinct from new.status and new.status = 'cancelada' then
      insert into public.os_logs(company_id, os_id, usuario_id, acao, valor_anterior, valor_novo)
      values (new.company_id, new.id, auth.uid(), 'cancelamento', to_jsonb(old), to_jsonb(new));
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enqueue_os_status_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status in ('pronto', 'aguardando_aprovacao', 'cancelada') then
    insert into public.alert_dispatch_queue(company_id, os_id, trigger_status, payload)
    values (
      new.company_id,
      new.id,
      new.status,
      jsonb_build_object(
        'os_id', new.id,
        'status', new.status,
        'changed_by', auth.uid(),
        'changed_at', now()
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_record_id text;
begin
  if tg_op = 'DELETE' then
    v_company_id := old.company_id;
    v_record_id := coalesce(old.id::text, '');
  else
    v_company_id := new.company_id;
    v_record_id := coalesce(new.id::text, '');
  end if;

  if v_company_id is not null then
    insert into public.audit_logs(
      company_id, tabela_afetada, registro_id, usuario_id, acao, dados_antigos, dados_novos
    ) values (
      v_company_id,
      tg_table_name,
      v_record_id,
      auth.uid(),
      lower(tg_op),
      case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- =====================================================
-- 7) Financial query helpers (Dashboard + DRE)
-- =====================================================

create or replace function public.financial_kpis(p_company_id uuid, p_start timestamptz, p_end timestamptz)
returns table (
  receita numeric,
  custos numeric,
  margem numeric,
  inadimplencia numeric,
  ticket_medio numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with f as (
    select
      coalesce(sum(case when tipo = 'receita' then valor else 0 end), 0) as receita,
      coalesce(sum(case when tipo = 'custo' then valor else 0 end), 0) as custos
    from public.movimentacoes_financeiras
    where company_id = p_company_id
      and created_at >= p_start
      and created_at < p_end
  ),
  so as (
    select
      coalesce(sum(greatest(total_valor - valor_pago, 0)), 0) as inadimplencia,
      coalesce(avg(total_valor), 0) as ticket_medio
    from public.service_orders
    where company_id = p_company_id
      and created_at >= p_start
      and created_at < p_end
  )
  select
    f.receita,
    f.custos,
    (f.receita - f.custos) as margem,
    so.inadimplencia,
    so.ticket_medio
  from f, so
$$;

-- =====================================================
-- 8) Triggers
-- =====================================================

drop trigger if exists trg_service_orders_updated_at on public.service_orders;
create trigger trg_service_orders_updated_at
before update on public.service_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_app_states_updated_at on public.app_states;
create trigger trg_app_states_updated_at
before update on public.app_states
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop trigger if exists trg_os_logs on public.service_orders;
create trigger trg_os_logs
after update on public.service_orders
for each row execute function public.log_service_order_changes();

drop trigger if exists trg_os_alerts on public.service_orders;
create trigger trg_os_alerts
after update of status on public.service_orders
for each row execute function public.enqueue_os_status_alert();

drop trigger if exists trg_audit_service_orders on public.service_orders;
create trigger trg_audit_service_orders
after insert or update or delete on public.service_orders
for each row execute function public.log_audit();

drop trigger if exists trg_audit_mov on public.movimentacoes_financeiras;
create trigger trg_audit_mov
after insert or update or delete on public.movimentacoes_financeiras
for each row execute function public.log_audit();

drop trigger if exists trg_audit_permissions on public.user_permissions;
create trigger trg_audit_permissions
after insert or update or delete on public.user_permissions
for each row execute function public.log_audit();

-- =====================================================
-- 9) Indexes
-- =====================================================

create index if not exists idx_users_company on public.users(company_id);
create index if not exists idx_so_company on public.service_orders(company_id);
create index if not exists idx_so_status on public.service_orders(company_id, status);
create index if not exists idx_os_logs_company on public.os_logs(company_id, created_at desc);
create index if not exists idx_mov_company on public.movimentacoes_financeiras(company_id, created_at desc);
create index if not exists idx_audit_company on public.audit_logs(company_id, created_at desc);
create index if not exists idx_alert_queue on public.alert_dispatch_queue(company_id, processed, created_at);

-- =====================================================
-- 10) RLS
-- =====================================================

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.permissions enable row level security;
alter table public.user_permissions enable row level security;
alter table public.app_states enable row level security;
alter table public.service_orders enable row level security;
alter table public.os_logs enable row level security;
alter table public.movimentacoes_financeiras enable row level security;
alter table public.audit_logs enable row level security;
alter table public.alert_dispatch_queue enable row level security;

-- companies
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
for select to authenticated
using (public.is_super_admin() or id = public.current_user_company_id());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists companies_delete on public.companies;
create policy companies_delete on public.companies
for delete to authenticated
using (public.is_super_admin());

-- users
drop policy if exists users_select on public.users;
create policy users_select on public.users
for select to authenticated
using (
  public.is_super_admin()
  or id = auth.uid()
  or (company_id is not null and public.can_access_company(company_id))
);

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
for insert to authenticated
with check (
  public.is_super_admin()
  or (company_id is not null and public.can_manage_company_users(company_id))
);

drop policy if exists users_update on public.users;
create policy users_update on public.users
for update to authenticated
using (
  public.is_super_admin()
  or id = auth.uid()
  or (company_id is not null and public.can_manage_company_users(company_id))
)
with check (
  public.is_super_admin()
  or id = auth.uid()
  or (company_id is not null and public.can_manage_company_users(company_id))
);

drop policy if exists users_delete on public.users;
create policy users_delete on public.users
for delete to authenticated
using (
  public.is_super_admin()
  or (company_id is not null and public.can_manage_company_users(company_id))
);

-- permissions
drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
for select to authenticated
using (true);

drop policy if exists permissions_write on public.permissions;
create policy permissions_write on public.permissions
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- user_permissions
drop policy if exists user_permissions_select on public.user_permissions;
create policy user_permissions_select on public.user_permissions
for select to authenticated
using (
  public.is_super_admin()
  or user_id = auth.uid()
  or public.can_manage_company_users(company_id)
);

drop policy if exists user_permissions_write on public.user_permissions;
create policy user_permissions_write on public.user_permissions
for all to authenticated
using (
  public.is_super_admin()
  or public.can_manage_company_users(company_id)
)
with check (
  public.is_super_admin()
  or public.can_manage_company_users(company_id)
);

-- app_states
drop policy if exists app_states_select on public.app_states;
create policy app_states_select on public.app_states
for select to authenticated
using (
  public.is_super_admin()
  or (user_id = auth.uid() and public.can_access_company(company_id))
);

drop policy if exists app_states_insert on public.app_states;
create policy app_states_insert on public.app_states
for insert to authenticated
with check (
  public.is_super_admin()
  or (user_id = auth.uid() and public.can_access_company(company_id))
);

drop policy if exists app_states_update on public.app_states;
create policy app_states_update on public.app_states
for update to authenticated
using (
  public.is_super_admin()
  or (user_id = auth.uid() and public.can_access_company(company_id))
)
with check (
  public.is_super_admin()
  or (user_id = auth.uid() and public.can_access_company(company_id))
);

drop policy if exists app_states_delete on public.app_states;
create policy app_states_delete on public.app_states
for delete to authenticated
using (
  public.is_super_admin()
  or (user_id = auth.uid() and public.can_access_company(company_id))
);

-- service_orders
drop policy if exists so_select on public.service_orders;
create policy so_select on public.service_orders
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists so_insert on public.service_orders;
create policy so_insert on public.service_orders
for insert to authenticated
with check (public.can_access_company(company_id));

drop policy if exists so_update on public.service_orders;
create policy so_update on public.service_orders
for update to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

drop policy if exists so_delete on public.service_orders;
create policy so_delete on public.service_orders
for delete to authenticated
using (
  public.can_access_company(company_id)
  and public.has_permission('delete_os', company_id)
);

-- os_logs
drop policy if exists os_logs_select on public.os_logs;
create policy os_logs_select on public.os_logs
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists os_logs_insert on public.os_logs;
create policy os_logs_insert on public.os_logs
for insert to authenticated
with check (public.can_access_company(company_id));

-- movimentacoes_financeiras
drop policy if exists mov_select on public.movimentacoes_financeiras;
create policy mov_select on public.movimentacoes_financeiras
for select to authenticated
using (
  public.can_access_company(company_id)
  and public.has_permission('view_financial', company_id)
);

drop policy if exists mov_write on public.movimentacoes_financeiras;
create policy mov_write on public.movimentacoes_financeiras
for all to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

-- audit_logs
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
for select to authenticated
using (public.can_access_company(company_id));

-- alert queue
drop policy if exists alert_select on public.alert_dispatch_queue;
create policy alert_select on public.alert_dispatch_queue
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists alert_insert on public.alert_dispatch_queue;
create policy alert_insert on public.alert_dispatch_queue
for insert to authenticated
with check (public.can_access_company(company_id));

drop policy if exists alert_update on public.alert_dispatch_queue;
create policy alert_update on public.alert_dispatch_queue
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- =====================================================
-- 11) Grants
-- =====================================================

grant execute on function public.current_user_company_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.can_access_company(uuid) to authenticated;
grant execute on function public.can_manage_company_users(uuid) to authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;
grant execute on function public.assert_user_permission(text, uuid) to authenticated;
grant execute on function public.can_current_user_login() to authenticated;
grant execute on function public.super_admin_update_company_subscription(uuid, public.subscription_status, timestamptz, timestamptz) to authenticated;
grant execute on function public.master_update_company(uuid, public.subscription_status, timestamptz) to authenticated;
grant execute on function public.financial_kpis(uuid, timestamptz, timestamptz) to authenticated;
