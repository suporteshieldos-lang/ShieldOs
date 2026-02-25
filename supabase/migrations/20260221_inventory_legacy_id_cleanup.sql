-- Cleanup de IDs legados de inventario no app_states (ex: "inv-123...")
-- Faz o de-para usando SKU + company_id contra public.inventory_items.
-- Seguro para rodar mais de uma vez (idempotente).

create or replace function public.cleanup_legacy_inventory_ids(
  p_company_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_rows_updated integer := 0;
  v_items_fixed integer := 0;
begin
  v_company_id := coalesce(p_company_id, public.current_user_company_id());

  if v_company_id is null then
    raise exception 'Company nao identificada';
  end if;

  if not public.can_access_company(v_company_id) then
    raise exception 'Sem permissao para esta empresa';
  end if;

  with expanded as (
    select
      a.user_id,
      a.company_id,
      e.ord,
      e.item,
      coalesce(e.item->>'id', '') as old_id,
      upper(coalesce(e.item->>'sku', '')) as sku_norm
    from public.app_states a
    cross join lateral jsonb_array_elements(coalesce(a.data->'inventory', '[]'::jsonb)) with ordinality as e(item, ord)
    where a.company_id = v_company_id
  ),
  mapped as (
    select
      ex.user_id,
      ex.company_id,
      ex.ord,
      ex.item,
      ex.old_id,
      i.id::text as new_id
    from expanded ex
    left join public.inventory_items i
      on i.company_id = ex.company_id
     and upper(i.sku) = ex.sku_norm
  ),
  rebuilt as (
    select
      m.user_id,
      jsonb_agg(
        case
          when m.old_id like 'inv-%' and m.new_id is not null
            then jsonb_set(m.item, '{id}', to_jsonb(m.new_id), true)
          else m.item
        end
        order by m.ord
      ) as new_inventory,
      count(*) filter (where m.old_id like 'inv-%' and m.new_id is not null) as fixed_count
    from mapped m
    group by m.user_id
  ),
  updated as (
    update public.app_states a
       set data = jsonb_set(coalesce(a.data, '{}'::jsonb), '{inventory}', coalesce(r.new_inventory, '[]'::jsonb), true),
           updated_at = now()
      from rebuilt r
     where a.user_id = r.user_id
       and a.company_id = v_company_id
    returning r.fixed_count
  )
  select
    count(*),
    coalesce(sum(fixed_count), 0)
  into v_rows_updated, v_items_fixed
  from updated;

  return jsonb_build_object(
    'ok', true,
    'company_id', v_company_id,
    'rows_updated', v_rows_updated,
    'items_fixed', v_items_fixed
  );
end;
$$;

grant execute on function public.cleanup_legacy_inventory_ids(uuid) to authenticated;

