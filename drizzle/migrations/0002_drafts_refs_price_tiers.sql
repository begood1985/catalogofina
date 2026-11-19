alter table public.products alter column retail_price drop not null;
alter table public.products add column needs_review boolean not null default false;
alter table public.products add column external_ref text;
create unique index products_external_ref_key on public.products (external_ref) where external_ref is not null;

-- hide external_ref from anonymous visitors (column-level grants)
revoke select on public.products from anon;
grant select (id, sku, name, description, category_id, retail_price, wholesale_price, wholesale_min_qty, units_per_box, weight_kg, stock, image_url, active, needs_review, created_at, updated_at) on public.products to anon;

alter table public.order_items add column price_on_request boolean not null default false;
alter table public.orders add column has_unpriced_items boolean not null default false;

create table public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_qty int not null check (min_qty >= 1),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, min_qty)
);
grant select on public.price_tiers to anon, authenticated;
grant insert, update, delete on public.price_tiers to authenticated;
grant all on public.price_tiers to service_role;
alter table public.price_tiers enable row level security;
create policy "price tiers public read" on public.price_tiers for select to anon, authenticated using (true);
create policy "price tiers admin write" on public.price_tiers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));