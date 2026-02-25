create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  adjustment integer not null,
  reason text not null,
  previous_qty integer not null,
  new_qty integer not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.inventory_adjustments enable row level security;

drop policy if exists inventory_adjustments_select on public.inventory_adjustments;
create policy inventory_adjustments_select on public.inventory_adjustments
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists inventory_adjustments_insert on public.inventory_adjustments;
create policy inventory_adjustments_insert on public.inventory_adjustments
for insert to authenticated
with check (public.can_access_company(company_id));

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

  if exists (
    select 1
    from public.inventory_items i
    where i.company_id = v_item.company_id
      and upper(i.sku) = upper(p_sku)
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
    name = p_name,
    sku = upper(p_sku),
    category_id = v_item.category_id, -- keeps existing rel while UI still uses text category
    status = p_status,
    minimum_stock = p_min_qty,
    unit_cost = p_cost_price,
    sale_price = p_sale_price,
    location = p_location,
    unit = p_unit,
    notes = p_notes,
    quantity = v_new_qty
  where id = v_item.id;

  if p_stock_adjustment <> 0 then
    insert into public.inventory_adjustments (
      company_id, item_id, adjustment, reason, previous_qty, new_qty, created_by
    ) values (
      v_item.company_id, v_item.id, p_stock_adjustment, p_adjustment_reason, v_item.quantity, v_new_qty, auth.uid()
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
