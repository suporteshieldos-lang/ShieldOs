-- Guardrails for first company admin (owner)

alter table public.users
add column if not exists is_company_owner boolean not null default false;

-- Backfill: earliest admin user per company becomes company owner.
with ranked as (
  select
    u.id,
    row_number() over (partition by u.company_id order by u.created_at asc, u.id asc) as rn
  from public.users u
  where u.company_id is not null
    and coalesce(u.role, '') = 'admin'
)
update public.users u
set is_company_owner = (r.rn = 1)
from ranked r
where u.id = r.id;

create or replace function public.assign_company_owner_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_users boolean;
begin
  if new.company_id is null then
    return new;
  end if;

  select exists(
    select 1
    from public.users u
    where u.company_id = new.company_id
  ) into v_has_users;

  -- First user in a company must be admin/owner.
  if not v_has_users then
    new.role := 'admin';
    new.role_base := 'admin';
    new.is_company_owner := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_company_owner_defaults on public.users;
create trigger trg_assign_company_owner_defaults
before insert on public.users
for each row execute function public.assign_company_owner_defaults();

create or replace function public.protect_company_owner_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only super admin can change role/active status/owner flag of company owner.
  if old.is_company_owner and not public.is_super_admin() then
    if new.role is distinct from old.role
       or new.role_base is distinct from old.role_base
       or new.ativo is distinct from old.ativo
       or new.company_id is distinct from old.company_id
       or new.is_company_owner is distinct from old.is_company_owner then
      raise exception 'Somente a dona do aplicativo pode alterar o admin principal da empresa.';
    end if;
  end if;

  -- Non-super-admin cannot grant owner flag.
  if not public.is_super_admin()
     and new.is_company_owner
     and not old.is_company_owner then
    raise exception 'Somente a dona do aplicativo pode definir owner da empresa.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_company_owner_user on public.users;
create trigger trg_protect_company_owner_user
before update on public.users
for each row execute function public.protect_company_owner_user();

create or replace function public.prevent_delete_company_owner_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_company_owner and not public.is_super_admin() then
    raise exception 'Somente a dona do aplicativo pode remover o admin principal da empresa.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_company_owner_user on public.users;
create trigger trg_prevent_delete_company_owner_user
before delete on public.users
for each row execute function public.prevent_delete_company_owner_user();
