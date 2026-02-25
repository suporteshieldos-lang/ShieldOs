-- Bootstrap de conta DONA (master admin) + visao de usuarios

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
  when role_system = 'super_admin' then 'master_admin'
  when role_base = 'admin' then 'admin'
  else 'tecnico'
end
where role is null;

create or replace function public.make_master_admin_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    raise exception 'Usuario auth nao encontrado para o email %', p_email;
  end if;

  insert into public.users (id, company_id, nome, email, role, role_base, role_system, ativo)
  values (
    v_user_id,
    null,
    split_part(p_email, '@', 1),
    p_email,
    'master_admin',
    'admin',
    'super_admin',
    true
  )
  on conflict (id) do update
    set company_id = null,
        email = excluded.email,
        role = 'master_admin',
        role_base = 'admin',
        role_system = 'super_admin',
        ativo = true;

  return v_user_id;
end;
$$;

create or replace view public.vw_master_usuarios as
select
  u.id,
  u.nome,
  coalesce(u.email, au.email) as email,
  u.role,
  u.role_system,
  u.ativo,
  u.company_id,
  c.nome_empresa,
  c.status_assinatura,
  c.vencimento,
  u.created_at,
  case when u.ativo then 'ativo' else 'inativo' end as status_usuario
from public.users u
left join auth.users au on au.id = u.id
left join public.companies c on c.id = u.company_id
order by u.created_at desc;

grant execute on function public.make_master_admin_by_email(text) to authenticated;
