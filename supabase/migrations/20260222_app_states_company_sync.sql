-- Allow all authenticated users of a company to read latest shared app_state snapshot.
-- Write/update/delete remains scoped to owner row (user_id = auth.uid()).

drop policy if exists app_states_select on public.app_states;
create policy app_states_select on public.app_states
for select to authenticated
using (
  public.is_super_admin()
  or public.can_access_company(company_id)
);

