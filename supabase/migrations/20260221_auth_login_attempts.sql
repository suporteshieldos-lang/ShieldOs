create table if not exists public.auth_login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  success boolean not null,
  reason text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.auth_login_attempts enable row level security;

drop policy if exists auth_login_attempts_insert on public.auth_login_attempts;
create policy auth_login_attempts_insert on public.auth_login_attempts
for insert
to anon, authenticated
with check (true);

drop policy if exists auth_login_attempts_select on public.auth_login_attempts;
create policy auth_login_attempts_select on public.auth_login_attempts
for select
to authenticated
using (public.is_super_admin());
