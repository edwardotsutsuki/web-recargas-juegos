-- ==============================================================================
-- Migración 0005: Personalización de Imágenes de Productos y Sistema de Promociones
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Tabla: Personalización de Juegos y Portadas (Admin Overrides)
-- ------------------------------------------------------------------------------
create table if not exists public.catalog_game_overrides (
  game_id text primary key,
  custom_name text,
  custom_image_url text,
  custom_banner_url text,
  custom_badge text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.catalog_game_overrides enable row level security;

drop policy if exists "Lectura pública de personalizaciones de catálogo" on public.catalog_game_overrides;
create policy "Lectura pública de personalizaciones de catálogo"
  on public.catalog_game_overrides
  for select
  using (true);

-- ------------------------------------------------------------------------------
-- 2. Tabla: Sistema de Avisos de Promociones y Campañas
-- ------------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  badge_text text not null default 'PROMO EXCLUSIVA',
  banner_image_url text,
  action_url text,
  action_label text default 'Aprovechar Oferta',
  placement text not null default 'top_banner' check (placement in ('top_banner', 'hero', 'modal')),
  is_active boolean not null default true,
  start_date timestamptz default now(),
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

drop policy if exists "Promociones activas visibles para todos" on public.promotions;
create policy "Promociones activas visibles para todos"
  on public.promotions
  for select
  using (is_active = true);

-- Semilla de promociones atractivas para revendedores
insert into public.promotions (title, message, badge_text, action_url, action_label, placement, is_active)
values
  (
    '🔥 ¡Semana del Diamante Free Fire!',
    'Disfruta de tarifas preferenciales en todos los paquetes de Free Fire LATAM con entrega automatizada en menos de 60 segundos.',
    'HOT PROMO',
    '/catalog',
    'Ir a la Tienda',
    'top_banner',
    true
  ),
  (
    '⚡ Bono del 5% en Depósitos Bancarios Mayores a $50',
    'Reporta tu pago a Banco Pichincha, Guayaquil o Pacífico y recibe 5% de saldo adicional acreditado directamente por administración.',
    'BONO SALDO',
    '/wallet/deposit',
    'Recargar Saldo',
    'hero',
    true
  )
on conflict do nothing;

commit;

