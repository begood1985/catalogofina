create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- first account becomes admin
create or replace function public.bootstrap_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_bootstrap after insert on auth.users
for each row execute function public.bootstrap_first_admin();

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  brand_name text not null default 'FinaSub',
  tagline text not null default 'Insumos de sublimação para revenda e produção',
  whatsapp_phone text not null default '',
  min_order_value numeric(12,2) not null default 250 check (min_order_value >= 0),
  payment_methods text[] not null default array['PIX','Boleto','Cartão de crédito','Transferência'],
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "settings public read" on public.store_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.store_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (char_length(sku) between 1 and 60),
  name text not null check (char_length(name) between 1 and 200),
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  retail_price numeric(12,2) not null check (retail_price >= 0),
  wholesale_price numeric(12,2) check (wholesale_price is null or wholesale_price >= 0),
  wholesale_min_qty int not null default 0 check (wholesale_min_qty >= 0),
  units_per_box int not null default 1 check (units_per_box >= 1),
  weight_kg numeric(10,3) check (weight_kg is null or weight_kg >= 0),
  stock int check (stock is null or stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "active products public" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "products admin write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.discount_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  min_qty int not null check (min_qty >= 1),
  percent numeric(5,2) not null check (percent > 0 and percent < 100),
  created_at timestamptz not null default now()
);
grant select on public.discount_tiers to anon, authenticated;
grant insert, update, delete on public.discount_tiers to authenticated;
grant all on public.discount_tiers to service_role;
alter table public.discount_tiers enable row level security;
create policy "tiers public read" on public.discount_tiers for select to anon, authenticated using (true);
create policy "tiers admin write" on public.discount_tiers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  whatsapp text not null,
  document text,
  payment_method text not null,
  notes text,
  subtotal numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  total_units int not null,
  total_boxes int not null,
  total_weight_kg numeric(10,3),
  status text not null default 'novo' check (status in ('novo','em_atendimento','aprovado','cancelado','concluido')),
  created_at timestamptz not null default now()
);
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders admin" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  name text not null,
  quantity int not null,
  boxes int not null,
  unit_price numeric(12,2) not null,
  discount_percent numeric(5,2) not null default 0,
  line_total numeric(12,2) not null,
  weight_kg numeric(10,3)
);
grant select, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items admin" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));