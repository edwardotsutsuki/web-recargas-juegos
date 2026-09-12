-- ==============================================================================
-- Migración 0003: Cuentas Autorizadas, Solicitudes de Depósito y Aprobación
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Tabla: Métodos de Pago y Cuentas Bancarias Autorizadas
-- ------------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_type text not null,
  account_number text not null,
  account_holder text not null,
  notes text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_payment_methods_active on public.payment_methods(is_active, sort_order);

-- Seed de cuentas autorizadas iniciales (Ecuador y Cripto)
insert into public.payment_methods (bank_name, account_type, account_number, account_holder, sort_order)
values
  ('BANCO DEL PACÍFICO', 'Ahorros', '1060251921', 'Kevin Guerrero', 1),
  ('BANCO GUAYAQUIL', 'Ahorros', '47761641', 'Kevin Guerrero', 2),
  ('BANCO PICHINCHA', 'Ahorros', '2200570913', 'Kevin Guerrero', 3),
  ('BINANCE PAY (USDT)', 'Pay ID', '281449411', 'XTREMEPLAY', 4),
  ('PAYPAL', 'Transferencia USD', 'pagos@xtremeplay.me', 'XtremePlay Global', 5)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 2. Tabla: Solicitudes de Depósito y Vouchers
-- ------------------------------------------------------------------------------
create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  bank_name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD',
  reference_number text not null,
  voucher_url text not null,
  voucher_hash text,
  voucher_compressed_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_bank_reference unique (bank_name, reference_number)
);

-- Índices
create index if not exists idx_deposit_requests_user on public.deposit_requests(user_id, created_at desc);
create index if not exists idx_deposit_requests_status on public.deposit_requests(status, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ------------------------------------------------------------------------------
alter table public.payment_methods enable row level security;
alter table public.deposit_requests enable row level security;

-- Payment methods: lectura pública para cuentas activas
drop policy if exists "Cuentas bancarias visibles para todos" on public.payment_methods;
create policy "Cuentas bancarias visibles para todos"
  on public.payment_methods
  for select
  using (is_active = true);

-- Deposit requests: revendedores pueden ver e insertar sus propias solicitudes
drop policy if exists "Usuarios ven sus propios depositos" on public.deposit_requests;
create policy "Usuarios ven sus propios depositos"
  on public.deposit_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Usuarios crean sus propios depositos" on public.deposit_requests;
create policy "Usuarios crean sus propios depositos"
  on public.deposit_requests
  for insert
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. RPC: Aprobar Depósito y Acreditar Saldo de Forma Atómica
-- ------------------------------------------------------------------------------
create or replace function public.approve_deposit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_compressed_voucher_url text default null,
  p_voucher_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.deposit_requests;
  v_credit_res jsonb;
begin
  -- 1. Bloquear y verificar la solicitud
  select * into v_req
  from public.deposit_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Solicitud de depósito % no encontrada.', p_request_id;
  end if;

  if v_req.status != 'pending' then
    raise exception 'La solicitud % ya fue procesada anteriormente (estado: %).', p_request_id, v_req.status;
  end if;

  -- 2. Ejecutar acreditación atómica en la billetera
  v_credit_res := public.credit_wallet(
    p_user_id := v_req.user_id,
    p_amount_minor := v_req.amount_cents,
    p_currency := v_req.currency,
    p_idempotency_key := 'DEP-' || v_req.id::text,
    p_reason := 'Depósito bancario aprobado: ' || v_req.bank_name || ' (Ref: ' || v_req.reference_number || ')',
    p_actor_id := p_admin_id,
    p_source := 'bank_deposit',
    p_external_reference := v_req.reference_number
  );

  -- 3. Actualizar la solicitud con los metadatos y voucher comprimido
  update public.deposit_requests
  set
    status = 'approved',
    approved_by = p_admin_id,
    approved_at = now(),
    updated_at = now(),
    voucher_compressed_url = coalesce(p_compressed_voucher_url, voucher_url),
    voucher_hash = coalesce(p_voucher_hash, v_req.voucher_hash)
  where id = p_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_req.id,
    'user_id', v_req.user_id,
    'amount_cents', v_req.amount_cents,
    'currency', v_req.currency,
    'credit_result', v_credit_res
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: Rechazar Depósito con Motivo
-- ------------------------------------------------------------------------------
create or replace function public.reject_deposit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.deposit_requests;
begin
  select * into v_req
  from public.deposit_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Solicitud de depósito % no encontrada.', p_request_id;
  end if;

  if v_req.status != 'pending' then
    raise exception 'La solicitud % ya fue procesada anteriormente (estado: %).', p_request_id, v_req.status;
  end if;

  update public.deposit_requests
  set
    status = 'rejected',
    rejection_reason = p_reason,
    approved_by = p_admin_id,
    approved_at = now(),
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_req.id,
    'status', 'rejected',
    'reason', p_reason
  );
end;
$$;

-- Permisos estrictos: solo service_role
revoke execute on function public.approve_deposit_request(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.approve_deposit_request(uuid, uuid, text, text) to service_role;

revoke execute on function public.reject_deposit_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_deposit_request(uuid, uuid, text) to service_role;

commit;

