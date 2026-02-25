-- Sale reversal support: deleting a piece sale restores stock atomically.

alter table if exists public.movimentacoes_financeiras
  add column if not exists detalhes jsonb;

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
  v_finance_id uuid;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'Quantidade invalida';
  end if;
  if p_unit_sale_price is null or p_unit_sale_price <= 0 then
    raise exception 'Informe um valor de venda valido';
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

  if v_item.quantity < p_qty then
    raise exception 'Estoque insuficiente';
  end if;

  update public.inventory_items
  set quantity = quantity - p_qty
  where id = v_item.id;

  v_total := round((p_unit_sale_price * p_qty)::numeric, 2);

  insert into public.movimentacoes_financeiras (company_id, tipo, valor, categoria, os_id, detalhes)
  values (
    v_item.company_id,
    'receita',
    v_total,
    coalesce(p_description, 'Venda de peca'),
    null,
    jsonb_build_object(
      'kind', 'inventory_sale',
      'item_id', v_item.id,
      'qty', p_qty,
      'unit_sale_price', p_unit_sale_price
    )
  )
  returning id into v_finance_id;

  return jsonb_build_object(
    'ok', true,
    'item_id', v_item.id,
    'qty_sold', p_qty,
    'new_qty', v_item.quantity - p_qty,
    'unit_sale_price', p_unit_sale_price,
    'total', v_total,
    'finance_id', v_finance_id
  );
end;
$$;

create or replace function public.delete_inventory_sale(
  p_finance_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov public.movimentacoes_financeiras%rowtype;
  v_item public.inventory_items%rowtype;
  v_item_id uuid;
  v_qty integer;
begin
  select *
    into v_mov
  from public.movimentacoes_financeiras
  where id = p_finance_id
  for update;

  if not found then
    raise exception 'Venda nao encontrada';
  end if;

  if not public.can_access_company(v_mov.company_id) then
    raise exception 'Sem permissao para esta empresa';
  end if;

  if coalesce(v_mov.detalhes->>'kind', '') <> 'inventory_sale' then
    raise exception 'Movimentacao nao e venda de estoque';
  end if;

  v_item_id := nullif(v_mov.detalhes->>'item_id', '')::uuid;
  v_qty := coalesce((v_mov.detalhes->>'qty')::integer, 0);

  if v_item_id is null or v_qty < 1 then
    raise exception 'Dados da venda invalidos para reversao';
  end if;

  select *
    into v_item
  from public.inventory_items
  where id = v_item_id
  for update;

  if not found then
    raise exception 'Peca da venda nao encontrada';
  end if;

  if v_item.company_id <> v_mov.company_id then
    raise exception 'Inconsistencia de empresa na reversao da venda';
  end if;

  update public.inventory_items
  set quantity = quantity + v_qty
  where id = v_item.id;

  delete from public.movimentacoes_financeiras
  where id = v_mov.id;

  return jsonb_build_object(
    'ok', true,
    'item_id', v_item.id,
    'restored_qty', v_qty,
    'new_qty', v_item.quantity + v_qty
  );
end;
$$;

grant execute on function public.register_inventory_sale(uuid, integer, numeric, text) to authenticated;
grant execute on function public.delete_inventory_sale(uuid) to authenticated;

