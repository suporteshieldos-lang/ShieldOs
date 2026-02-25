-- Fix edit flow: allow editing non-SKU fields even if legacy duplicate SKUs exist.
-- Duplicate check is enforced only when SKU value is changed.

create or replace function public.update_inventory_item_secure(
  p_item_id uuid,
  p_name text,
  p_sku text,
  p_category text,
  p_status public.inventory_status,
  p_min_qty integer,
  p_cost_price numeric,
  p_sale_price numeric,
  p_supplier text default null,
  p_location text default null,
  p_unit public.inventory_unit default 'UN',
  p_notes text default null,
  p_stock_adjustment integer default 0,
  p_adjustment_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_new_qty integer;
  v_new_sku text;
  v_old_sku text;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Nome da peca e obrigatorio';
  end if;
  if p_sku is null or btrim(p_sku) = '' then
    raise exception 'SKU e obrigatorio';
  end if;
  if p_min_qty < 0 then
    raise exception 'Estoque minimo nao pode ser negativo';
  end if;
  if p_cost_price < 0 then
    raise exception 'Custo nao pode ser negativo';
  end if;
  if p_sale_price <= 0 then
    raise exception 'Preco de venda deve ser maior que zero';
  end if;
  if p_stock_adjustment <> 0 and (p_adjustment_reason is null or btrim(p_adjustment_reason) = '') then
    raise exception 'Motivo do ajuste de estoque e obrigatorio';
  end if;

  select *
    into v_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Peca nao encontrada';
  end if;

  if not public.can_access_company(v_item.company_id) then
    raise exception 'Sem permissao para esta empresa';
  end if;

  v_new_sku := upper(btrim(p_sku));
  v_old_sku := upper(btrim(v_item.sku));

  -- Validate SKU uniqueness only when SKU changes.
  if v_new_sku <> v_old_sku and exists (
    select 1
    from public.inventory_items i
    where i.company_id = v_item.company_id
      and upper(btrim(i.sku)) = v_new_sku
      and i.id <> v_item.id
  ) then
    raise exception 'SKU ja cadastrado para esta empresa';
  end if;

  v_new_qty := v_item.quantity + coalesce(p_stock_adjustment, 0);
  if v_new_qty < 0 then
    raise exception 'Estoque insuficiente para ajuste';
  end if;

  update public.inventory_items
  set
    name = btrim(p_name),
    sku = v_new_sku,
    category_id = v_item.category_id,
    status = p_status,
    minimum_stock = p_min_qty,
    unit_cost = p_cost_price,
    sale_price = p_sale_price,
    location = nullif(btrim(coalesce(p_location, '')), ''),
    unit = p_unit,
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    quantity = v_new_qty
  where id = v_item.id;

  if p_stock_adjustment <> 0 then
    insert into public.inventory_adjustments (
      company_id, item_id, adjustment, reason, previous_qty, new_qty, created_by
    ) values (
      v_item.company_id, v_item.id, p_stock_adjustment, btrim(p_adjustment_reason), v_item.quantity, v_new_qty, auth.uid()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_id', v_item.id,
    'new_qty', v_new_qty
  );
end;
$$;

grant execute on function public.update_inventory_item_secure(
  uuid, text, text, text, public.inventory_status, integer, numeric, numeric, text, text, public.inventory_unit, text, integer, text
) to authenticated;

