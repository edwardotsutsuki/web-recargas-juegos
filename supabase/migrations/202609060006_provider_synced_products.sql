-- Migracion: Tabla de productos sincronizados de Canjea API
create table if not exists public.provider_synced_products (
  sku text primary key,
  game_id text not null,
  game_name text not null,
  name text not null,
  wholesale_price text,
  suggested_price text,
  currency text default 'USD',
  requires_player_id boolean default false,
  can_verify_player boolean default false,
  is_active boolean default true,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  notified_admin boolean default false
);

create index if not exists idx_provider_synced_products_game_id on public.provider_synced_products(game_id);

alter table public.provider_synced_products enable row level security;

drop policy if exists "Lectura publica de productos sincronizados" on public.provider_synced_products;
create policy "Lectura publica de productos sincronizados"
  on public.provider_synced_products
  for select
  using (true);

drop policy if exists "Modificacion exclusiva de service role" on public.provider_synced_products;
create policy "Modificacion exclusiva de service role"
  on public.provider_synced_products
  for all
  using (auth.jwt() ->> 'role' = 'service_role' or current_user = 'postgres');

