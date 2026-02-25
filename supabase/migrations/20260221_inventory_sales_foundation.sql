-- Inventory foundation: categories, suppliers, inventory_items

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type public.inventory_status as enum ('ativo', 'inativo', 'descontinuado');
  end if;
  if not exists (select 1 from pg_type where typname = 'inventory_unit') then
    create type public.inventory_unit as enum ('UN', 'CX', 'KG', 'M');
  end if;
end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  sku text not null,
  category_id uuid not null references public.categories(id),
  status public.inventory_status not null default 'ativo',
  quantity integer not null default 0 check (quantity >= 0),
  unit public.inventory_unit not null default 'UN',
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  location text,
  unit_cost numeric(12,2) not null check (unit_cost > 0),
  sale_price numeric(12,2) not null check (sale_price > 0),
  supplier_id uuid references public.suppliers(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);

alter table public.inventory_items add column if not exists sale_price numeric(12,2);
update public.inventory_items set sale_price = coalesce(sale_price, unit_cost) where sale_price is null;
alter table public.inventory_items alter column sale_price set not null;

create index if not exists idx_inventory_items_company on public.inventory_items(company_id, created_at desc);
create index if not exists idx_inventory_items_sku on public.inventory_items(company_id, sku);

insert into public.categories (company_id, name)
select c.id, v.name
from public.companies c
cross join (
  values
    ('Bateria'),
    ('Tela'),
    ('Conector'),
    ('Acessorio'),
    ('Audio'),
    ('Carregador')
) as v(name)
on conflict (company_id, name) do nothing;

insert into public.suppliers (company_id, name)
select c.id, v.name
from public.companies c
cross join (
  values
    ('Fornecedor Padrao'),
    ('Distribuidor Nacional'),
    ('Importadora Local')
) as v(name)
on conflict (company_id, name) do nothing;

create or replace function public.touch_inventory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inventory_updated_at on public.inventory_items;
create trigger trg_inventory_updated_at
before update on public.inventory_items
for each row execute function public.touch_inventory_updated_at();

alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
for all to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers
for all to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

drop policy if exists inventory_items_select on public.inventory_items;
create policy inventory_items_select on public.inventory_items
for select to authenticated
using (public.can_access_company(company_id));

drop policy if exists inventory_items_write on public.inventory_items;
create policy inventory_items_write on public.inventory_items
for all to authenticated
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));
