-- Atomic inventory sale registration with stock validation and race protection

create or replace function public.register_inventory_sale(
  p_item_id uuid,
  p_qty integer,
  p_unit_sale_price numeric,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_total numeric(12,2);
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'Quantidade invalida';
  end if;
  if p_unit_sale_price is null or p_unit_sale_price <= 0 then
    raise exception 'Informe um valor de venda valido';
  end if;

  -- Lock item row to avoid concurrent oversell.
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

  if v_item.quantity < p_qty then
    raise exception 'Estoque insuficiente';
  end if;

  update public.inventory_items
  set quantity = quantity - p_qty
  where id = v_item.id;

  v_total := round((p_unit_sale_price * p_qty)::numeric, 2);

  insert into public.movimentacoes_financeiras (company_id, tipo, valor, categoria, os_id)
  values (v_item.company_id, 'receita', v_total, coalesce(p_description, 'Venda de peca'), null);

  return jsonb_build_object(
    'ok', true,
    'item_id', v_item.id,
    'qty_sold', p_qty,
    'new_qty', v_item.quantity - p_qty,
    'unit_sale_price', p_unit_sale_price,
    'total', v_total
  );
end;
$$;

grant execute on function public.register_inventory_sale(uuid, integer, numeric, text) to authenticated;
