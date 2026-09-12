-- ==============================================================================
-- Migración 0008: Mejoras Administrativas, 2FA, Mesa de Ayuda y Materiales
-- ==============================================================================

begin;

-- 1. Ampliar profiles con columnas para 2FA y otorgar permisos de actualización a service_role
alter table public.profiles
  add column if not exists two_factor_enabled boolean not null default false,
  add column if not exists two_factor_secret text;

grant select, update on public.profiles to service_role;

-- 2. Ampliar system_settings con correo de notificaciones configurable
alter table public.system_settings
  add column if not exists notification_sender_email text not null default 'notificaciones@xtremeplay.me';

-- 3. Tabla: Material Promocional y Descargas Gastables
create table if not exists public.promotional_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('banner', 'guide', 'pricing_template', 'other')),
  file_url text not null,
  format text not null default 'ZIP',
  file_size_mb numeric(6,2) default 5.00,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotional_materials enable row level security;

drop policy if exists "Materiales visibles para todos" on public.promotional_materials;
create policy "Materiales visibles para todos"
  on public.promotional_materials
  for select
  using (is_active = true);

-- 4. Tabla: Mesa de Ayuda y Tickets de Soporte
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_email text not null,
  subject text not null,
  category text not null check (category in ('recharge_issue', 'deposit_inquiry', 'account_help', 'suggestion', 'other')),
  message text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);

alter table public.support_tickets enable row level security;

drop policy if exists "Usuarios ven sus propios tickets" on public.support_tickets;
create policy "Usuarios ven sus propios tickets"
  on public.support_tickets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Sembrar / Actualizar Cuentas Solicitadas:
-- Super Admin: b.edumalta@gmail.com
-- Cliente 1: edward.otsutsuki@gmail.com
-- Cliente 2: salvatierragenesis73@gmail.com

-- Super Admin
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'b.edumalta@gmail.com',
  '',
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Admin (Edward Malta)"}',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = 'b.edumalta@gmail.com',
  raw_user_meta_data = '{"full_name": "Super Admin (Edward Malta)"}',
  updated_at = now();

UPDATE public.profiles
SET role = 'admin', full_name = 'Super Admin (Edward Malta)'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Cliente 1: edward.otsutsuki@gmail.com
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'edward.otsutsuki@gmail.com',
  '',
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Edward Otsutsuki"}',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = 'edward.otsutsuki@gmail.com',
  raw_user_meta_data = '{"full_name": "Edward Otsutsuki"}',
  updated_at = now();

UPDATE public.profiles
SET role = 'client', full_name = 'Edward Otsutsuki'
WHERE id = '00000000-0000-0000-0000-000000000002';

INSERT INTO public.wallets (user_id, currency, balance_minor)
VALUES ('00000000-0000-0000-0000-000000000002', 'USD', 15000)
ON CONFLICT (user_id, currency) DO UPDATE SET balance_minor = 15000;

-- Cliente 2: salvatierragenesis73@gmail.com
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'salvatierragenesis73@gmail.com',
  '',
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Genesis Salvatierra"}',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = 'salvatierragenesis73@gmail.com',
  raw_user_meta_data = '{"full_name": "Genesis Salvatierra"}',
  updated_at = now();

UPDATE public.profiles
SET role = 'client', full_name = 'Genesis Salvatierra'
WHERE id = '00000000-0000-0000-0000-000000000003';

INSERT INTO public.wallets (user_id, currency, balance_minor)
VALUES ('00000000-0000-0000-0000-000000000003', 'USD', 7500)
ON CONFLICT (user_id, currency) DO UPDATE SET balance_minor = 7500;

-- 6. Sembrar materiales promocionales iniciales
INSERT INTO public.promotional_materials (title, description, category, file_url, format, file_size_mb, is_active, sort_order)
VALUES
  ('Kit de Banners Redes Sociales', 'Pack de imágenes en alta definición listas para historias de WhatsApp, Instagram y Facebook.', 'banner', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000', 'ZIP', 12.50, true, 1),
  ('Manual Oficial del Revendedor Gamer', 'Guía completa paso a paso para ubicar IDs de jugador, servidores y verificación de recargas.', 'guide', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'PDF', 2.10, true, 2),
  ('Plantilla de Precios PVP Editable', 'Formato Excel y Canva para colocar tus propios precios de venta al público y márgenes.', 'pricing_template', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'XLSX', 1.40, true, 3)
ON CONFLICT DO NOTHING;

-- 7. Sembrar ticket de prueba inicial
INSERT INTO public.support_tickets (user_id, user_email, subject, category, message, priority, status, admin_reply)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    'edward.otsutsuki@gmail.com',
    'Consulta sobre acreditación de depósito Banco Pichincha',
    'deposit_inquiry',
    'Hola administración, acabo de registrar un depósito por $50 y adjunté mi voucher comprobante. Quedo atento a la acreditación.',
    'normal',
    'resolved',
    'Hola Edward, tu depósito fue validado y acreditado a tu saldo virtual. ¡Buenas ventas!'
  )
ON CONFLICT DO NOTHING;

commit;

