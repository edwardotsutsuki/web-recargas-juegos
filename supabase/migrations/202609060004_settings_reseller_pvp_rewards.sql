-- ==============================================================================
-- Migración 0004: Configuración Global, Circuit Breaker, Precios PVP y Recompensas
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Ampliar profiles con código de referido y datos de contacto
-- ------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists referral_code text unique;

-- Función generadora de códigos de socio XP-XXXXXX
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := 'XP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    select exists(select 1 from public.profiles where referral_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- Trigger para auto-asignar referral_code a nuevos perfiles
create or replace function public.trg_assign_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists set_referral_code on public.profiles;
create trigger set_referral_code
  before insert on public.profiles
  for each row
  execute function public.trg_assign_referral_code();

-- Asignar códigos a perfiles existentes que no tengan uno
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

-- ------------------------------------------------------------------------------
-- 2. Tabla: Configuración Global del Sistema (Singleton)
-- ------------------------------------------------------------------------------
create table if not exists public.system_settings (
  id text primary key default 'singleton',
  canjea_warning_threshold_cents bigint not null default 5000,   -- $50.00 USD
  canjea_critical_threshold_cents bigint not null default 500,    -- $5.00 USD
  circuit_breaker_override text not null default 'auto' check (circuit_breaker_override in ('auto', 'force_open', 'force_pause')),
  rewards_enabled boolean not null default true,
  referral_commission_percent numeric(5,2) not null default 1.00, -- 1.00%
  updated_at timestamptz not null default now()
);

-- Insertar configuración inicial por defecto si no existe
insert into public.system_settings (id, canjea_warning_threshold_cents, canjea_critical_threshold_cents, circuit_breaker_override, rewards_enabled, referral_commission_percent)
values ('singleton', 5000, 500, 'auto', true, 1.00)
on conflict (id) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "Todos pueden leer la configuración del sistema" on public.system_settings;
create policy "Todos pueden leer la configuración del sistema"
  on public.system_settings
  for select
  using (true);

-- ------------------------------------------------------------------------------
-- 3. Tabla: Precios de Venta Personalizados del Revendedor (PVP)
-- ------------------------------------------------------------------------------
create table if not exists public.reseller_custom_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sku text not null,
  custom_pvp_cents bigint not null check (custom_pvp_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_sku unique (user_id, sku)
);

create index if not exists idx_reseller_prices_user on public.reseller_custom_prices(user_id);

alter table public.reseller_custom_prices enable row level security;

drop policy if exists "Revendedores gestionan sus propios precios PVP" on public.reseller_custom_prices;
create policy "Revendedores gestionan sus propios precios PVP"
  on public.reseller_custom_prices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Tabla: Sistema Modular de Recompensas
-- ------------------------------------------------------------------------------
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  target_sales_cents bigint not null check (target_sales_cents > 0),
  reward_bonus_cents bigint not null check (reward_bonus_cents > 0),
  game_id text, -- NULL = Aplica a todos los juegos
  badge_icon text not null default 'trophy',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rewards enable row level security;

drop policy if exists "Recompensas visibles para todos" on public.rewards;
create policy "Recompensas visibles para todos"
  on public.rewards
  for select
  using (is_active = true);

-- Recompensas iniciales de bienvenida para los socios revendedores
insert into public.rewards (title, description, target_sales_cents, reward_bonus_cents, game_id, badge_icon, is_active)
values
  ('Desafío de Bienvenida', 'Acumula tus primeros $25.00 en recargas y recibe un bono directo a tu saldo.', 2500, 100, null, 'sparkles', true),
  ('Maestro Free Fire', 'Alcanza $100.00 en recargas exclusivas de Free Fire durante el mes.', 10000, 350, 'free-fire', 'fire', true),
  ('Gamer Élite VIP', 'Alcanza $300.00 en recargas totales de cualquier juego para desbloquear comisiones VIP.', 30000, 1200, null, 'crown', true)
on conflict do nothing;

commit;

