-- WhatsApp message inbox/outbox per company

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id text,
  customer_phone text not null,
  customer_name text,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  status text not null default 'received' check (status in ('received', 'sent', 'failed')),
  provider text,
  provider_message_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_company_phone_idx
  on public.whatsapp_messages(company_id, customer_phone, created_at);

create index if not exists whatsapp_messages_company_order_idx
  on public.whatsapp_messages(company_id, order_id, created_at);

alter table public.whatsapp_messages enable row level security;

drop policy if exists whatsapp_messages_select on public.whatsapp_messages;
create policy whatsapp_messages_select
  on public.whatsapp_messages
  for select
  to authenticated
  using (public.can_access_company(company_id));

drop policy if exists whatsapp_messages_insert on public.whatsapp_messages;
create policy whatsapp_messages_insert
  on public.whatsapp_messages
  for insert
  to authenticated
  with check (public.can_access_company(company_id));

drop policy if exists whatsapp_messages_update on public.whatsapp_messages;
create policy whatsapp_messages_update
  on public.whatsapp_messages
  for update
  to authenticated
  using (public.can_access_company(company_id))
  with check (public.can_access_company(company_id));

