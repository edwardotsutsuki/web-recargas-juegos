-- =========================================================
-- Migration: 202609060001_initial_schema.sql
-- =========================================================
-- Ejecutar una vez con el propietario de la BD en Supabase.
begin;

create type public.user_role as enum ('admin', 'client');
create type public.order_status as enum
  ('held', 'processing', 'pending_reconciliation', 'succeeded', 'failed');
create type public.transaction_kind as enum ('credit', 'hold', 'capture', 'release');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  balance_minor bigint not null default 0 check (balance_minor >= 0),
  held_minor bigint not null default 0 check (held_minor >= 0 and held_minor <= balance_minor),
  available_minor bigint generated always as (balance_minor - held_minor) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, currency),
  unique (id, user_id, currency)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  wallet_id uuid not null,
  currency text not null,
  provider text not null check (length(provider) between 1 and 80),
  product_id text not null check (length(product_id) between 1 and 200),
  player_payload jsonb not null check (jsonb_typeof(player_payload) = 'object'),
  price_minor bigint not null check (price_minor > 0),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  status public.order_status not null default 'held',
  provider_reference text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  foreign key (wallet_id, user_id, currency) references public.wallets(id, user_id, currency),
  unique (user_id, idempotency_key),
  unique (provider, provider_reference),
  unique (id, wallet_id, user_id, currency),
  check ((status in ('succeeded', 'failed')) = (finalized_at is not null))
);
create index orders_user_created_idx on public.orders(user_id, created_at desc);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null,
  user_id uuid not null,
  currency text not null,
  order_id uuid,
  kind public.transaction_kind not null,
  amount_minor bigint not null check (amount_minor > 0),
  balance_delta_minor bigint not null,
  held_delta_minor bigint not null,
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  actor_id uuid references public.profiles(id) on delete restrict,
  source text not null check (length(source) between 1 and 80),
  external_reference text,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (wallet_id, user_id, currency) references public.wallets(id, user_id, currency),
  foreign key (order_id, wallet_id, user_id, currency)
    references public.orders(id, wallet_id, user_id, currency),
  unique (wallet_id, idempotency_key),
  check (
    (kind = 'credit' and order_id is null and balance_delta_minor = amount_minor and held_delta_minor = 0)
    or (kind = 'hold' and order_id is not null and balance_delta_minor = 0 and held_delta_minor = amount_minor)
    or (kind = 'capture' and order_id is not null and balance_delta_minor = -amount_minor and held_delta_minor = -amount_minor)
    or (kind = 'release' and order_id is not null and balance_delta_minor = 0 and held_delta_minor = -amount_minor)
  ),
  check (source <> 'manual' or
    (kind = 'credit' and actor_id is not null and length(trim(reason)) > 0 and reason is not null))
);
create unique index transactions_order_kind_idx on public.transactions(order_id, kind) where order_id is not null;
-- Una orden jamÃ¡s puede tener simultÃ¡neamente captura y liberaciÃ³n.
create unique index transactions_order_final_idx on public.transactions(order_id) where kind in ('capture', 'release');
create unique index transactions_credit_reference_idx on public.transactions(source, external_reference)
  where kind = 'credit' and external_reference is not null;
create index transactions_user_created_idx on public.transactions(user_id, created_at desc);

-- Cola persistente para desacoplar la retenciÃ³n del envÃ­o al proveedor.
create table public.purchase_jobs (
  order_id uuid primary key references public.orders(id) on delete restrict,
  state text not null default 'ready' check (state in ('ready', 'leased', 'reconcile', 'done')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error_code text,
  created_at timestamptz not null default now()
);
create index purchase_jobs_poll_idx on public.purchase_jobs(state, available_at);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger wallets_updated before update on public.wallets
for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders
for each row execute function public.touch_updated_at();

create function public.reject_transaction_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Ledger entries are immutable';
end;
$$;
create trigger transactions_immutable before update or delete on public.transactions
for each row execute function public.reject_transaction_mutation();

-- El rol nunca se obtiene de user_metadata controlable por el cliente.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, role) values (new.id, 'client');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.purchase_jobs enable row level security;

revoke all on public.profiles, public.wallets, public.orders, public.transactions, public.purchase_jobs
  from public, anon, authenticated, service_role;
grant select on public.profiles, public.wallets, public.orders, public.transactions to authenticated;
grant select on public.profiles, public.wallets, public.orders, public.transactions, public.purchase_jobs to service_role;

create policy profiles_read_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy wallets_read_own on public.wallets for select to authenticated using (user_id = (select auth.uid()));
create policy orders_read_own on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy transactions_read_own on public.transactions for select to authenticated using (user_id = (select auth.uid()));

revoke all on function public.touch_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.reject_transaction_mutation() from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- No se habilitan escrituras de dinero hasta implementar las RPC atÃ³micas
-- descritas en docs/architecture.md. service_role tampoco tiene DML directo.
commit;


-- =========================================================
-- Migration: 202609060002_transactional_rpcs.sql
-- =========================================================
-- ==============================================================================
-- MigraciÃ³n 0002: RPCs Transaccionales Monetarias y Despacho Idempotente
-- Ejecutar con el rol postgres / dashboard de Supabase en el SQL Editor.
-- Todas las funciones son SECURITY DEFINER con search_path = '' y permisos
-- restringidos exclusivamente a service_role (el cliente directo no tiene EXECUTE).
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Helper: Crear billetera de forma idempotente
-- ------------------------------------------------------------------------------
create or replace function public.create_wallet_if_not_exists(
  p_user_id uuid,
  p_currency text default 'USD'
)
returns public.wallets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets;
begin
  select * into v_wallet
  from public.wallets
  where user_id = p_user_id and currency = p_currency;

  if v_wallet.id is null then
    insert into public.wallets(user_id, currency, balance_minor, held_minor)
    values (p_user_id, p_currency, 0, 0)
    returning * into v_wallet;
  end if;

  return v_wallet;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: Acreditar saldo virtual a un usuario (Admin o Pasarela verificada)
-- Bloquea la billetera con FOR UPDATE, verifica idempotencia y registra en ledger.
-- ------------------------------------------------------------------------------
create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_reason text,
  p_actor_id uuid default null,
  p_source text default 'manual',
  p_external_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets;
  v_existing_tx public.transactions;
  v_new_balance bigint;
begin
  if p_amount_minor <= 0 then
    raise exception 'El monto a acreditar debe ser mayor a 0' using errcode = '22003';
  end if;

  -- 1. Asegurar o bloquear la billetera (Locking order: wallets primero)
  select * into v_wallet
  from public.wallets
  where user_id = p_user_id and currency = p_currency
  for update;

  if v_wallet.id is null then
    -- Si no existe billetera para esta moneda, crearla
    insert into public.wallets(user_id, currency, balance_minor, held_minor)
    values (p_user_id, p_currency, 0, 0)
    returning * into v_wallet;
  end if;

  -- 2. Verificar si la clave de idempotencia ya fue utilizada en esta billetera
  select * into v_existing_tx
  from public.transactions
  where wallet_id = v_wallet.id and idempotency_key = p_idempotency_key;

  if v_existing_tx.id is not null then
    -- Idempotencia: Si es el mismo payload, retornar el resultado previo sin alterar saldo
    if v_existing_tx.amount_minor = p_amount_minor and v_existing_tx.currency = p_currency then
      return jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'transaction_id', v_existing_tx.id,
        'wallet_id', v_wallet.id,
        'new_balance_minor', v_wallet.balance_minor,
        'available_minor', v_wallet.available_minor
      );
    else
      raise exception 'Clave de idempotencia ya utilizada con otro payload' using errcode = '23505';
    end if;
  end if;

  -- 3. Si viene referencia externa (ej. pasarela), verificar deduplicaciÃ³n
  if p_external_reference is not null then
    perform 1 from public.transactions
    where source = p_source and external_reference = p_external_reference and kind = 'credit';
    if found then
      raise exception 'Referencia externa ya procesada anteriormente' using errcode = '23505';
    end if;
  end if;

  -- 4. Registrar movimiento inmutable de crÃ©dito
  v_new_balance := v_wallet.balance_minor + p_amount_minor;

  insert into public.transactions(
    wallet_id,
    user_id,
    currency,
    kind,
    amount_minor,
    balance_delta_minor,
    held_delta_minor,
    idempotency_key,
    actor_id,
    source,
    external_reference,
    reason
  ) values (
    v_wallet.id,
    p_user_id,
    p_currency,
    'credit',
    p_amount_minor,
    p_amount_minor,
    0,
    p_idempotency_key,
    p_actor_id,
    p_source,
    p_external_reference,
    p_reason
  );

  -- 5. Actualizar balance total en billetera
  update public.wallets
  set balance_minor = v_new_balance,
      updated_at = now()
  where id = v_wallet.id;

  return jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'wallet_id', v_wallet.id,
    'credited_minor', p_amount_minor,
    'new_balance_minor', v_new_balance,
    'available_minor', v_new_balance - v_wallet.held_minor
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: Reservar compra (Hold atÃ³mico + CreaciÃ³n de Orden y Job)
-- Bloquea billetera, verifica saldo disponible, retiene fondos e inserta la orden y job.
-- ------------------------------------------------------------------------------
create or replace function public.reserve_purchase(
  p_user_id uuid,
  p_currency text,
  p_provider text,
  p_product_id text,
  p_price_minor bigint,
  p_player_payload jsonb,
  p_idempotency_key text,
  p_request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets;
  v_existing_order public.orders;
  v_order public.orders;
  v_new_held bigint;
begin
  if p_price_minor <= 0 then
    raise exception 'El precio de compra debe ser mayor a 0' using errcode = '22003';
  end if;

  -- 1. Verificar idempotencia por usuario y clave antes del bloqueo
  select * into v_existing_order
  from public.orders
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if v_existing_order.id is not null then
    -- Si coincide el fingerprint SHA-256 del payload, devolver la orden existente
    if v_existing_order.request_fingerprint = p_request_fingerprint then
      return jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'order_id', v_existing_order.id,
        'status', v_existing_order.status,
        'price_minor', v_existing_order.price_minor
      );
    else
      raise exception 'Clave de idempotencia ya usada con una solicitud distinta' using errcode = '23505';
    end if;
  end if;

  -- 2. Bloquear billetera con FOR UPDATE (Mismo orden de bloqueo)
  select * into v_wallet
  from public.wallets
  where user_id = p_user_id and currency = p_currency
  for update;

  if v_wallet.id is null then
    raise exception 'El usuario no tiene una billetera en moneda %', p_currency using errcode = 'P0002';
  end if;

  -- 3. Validar que el saldo disponible sea suficiente
  if v_wallet.available_minor < p_price_minor then
    raise exception 'Saldo disponible insuficiente (% < %)', v_wallet.available_minor, p_price_minor
      using errcode = 'P0001';
  end if;

  v_new_held := v_wallet.held_minor + p_price_minor;

  -- 4. Crear la orden en estado 'held'
  insert into public.orders(
    user_id,
    wallet_id,
    currency,
    provider,
    product_id,
    player_payload,
    price_minor,
    idempotency_key,
    request_fingerprint,
    status
  ) values (
    p_user_id,
    v_wallet.id,
    p_currency,
    p_provider,
    p_product_id,
    p_player_payload,
    p_price_minor,
    p_idempotency_key,
    p_request_fingerprint,
    'held'
  )
  returning * into v_order;

  -- 5. Registrar la transacciÃ³n inmutable de tipo 'hold'
  insert into public.transactions(
    wallet_id,
    user_id,
    currency,
    order_id,
    kind,
    amount_minor,
    balance_delta_minor,
    held_delta_minor,
    idempotency_key,
    source,
    reason
  ) values (
    v_wallet.id,
    p_user_id,
    p_currency,
    v_order.id,
    'hold',
    p_price_minor,
    0,
    p_price_minor,
    p_idempotency_key || '_hold',
    'purchase_flow',
    'RetenciÃ³n preventiva por orden ' || v_order.id
  );

  -- 6. Incrementar el saldo retenido en la billetera
  update public.wallets
  set held_minor = v_new_held,
      updated_at = now()
  where id = v_wallet.id;

  -- 7. Crear el trabajo durable en purchase_jobs para el worker asÃ­ncrono
  insert into public.purchase_jobs(order_id, state, attempts, available_at)
  values (v_order.id, 'ready', 0, now());

  return jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'order_id', v_order.id,
    'status', v_order.status,
    'price_minor', p_price_minor,
    'wallet_available_minor', v_wallet.balance_minor - v_new_held
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. RPC: Reclamar un trabajo de compra (Worker leasing con SKIP LOCKED)
-- ------------------------------------------------------------------------------
create or replace function public.claim_purchase_job(
  p_lease_seconds integer default 60,
  p_lease_token uuid default gen_random_uuid()
)
returns table (
  job_order_id uuid,
  job_attempts integer,
  job_lease_token uuid,
  order_user_id uuid,
  order_wallet_id uuid,
  order_currency text,
  order_provider text,
  order_product_id text,
  order_player_payload jsonb,
  order_price_minor bigint,
  order_idempotency_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_record record;
begin
  select j.order_id, j.attempts
  into v_job_record
  from public.purchase_jobs j
  where (j.state = 'ready' and j.available_at <= now())
     or (j.state = 'leased' and j.lease_until < now())
  order by j.available_at asc
  limit 1
  for update skip locked;

  if v_job_record.order_id is null then
    return;
  end if;

  -- Actualizar lease del trabajo
  update public.purchase_jobs
  set state = 'leased',
      attempts = v_job_record.attempts + 1,
      lease_until = now() + (p_lease_seconds || ' seconds')::interval,
      lease_token = p_lease_token
  where order_id = v_job_record.order_id;

  -- Actualizar estado de orden a 'processing'
  update public.orders
  set status = 'processing',
      updated_at = now()
  where id = v_job_record.order_id;

  -- Devolver detalles del pedido para llamar al proveedor
  return query
  select
    j.order_id as job_order_id,
    j.attempts as job_attempts,
    p_lease_token as job_lease_token,
    o.user_id as order_user_id,
    o.wallet_id as order_wallet_id,
    o.currency as order_currency,
    o.provider as order_provider,
    o.product_id as order_product_id,
    o.player_payload as order_player_payload,
    o.price_minor as order_price_minor,
    o.idempotency_key as order_idempotency_key
  from public.purchase_jobs j
  join public.orders o on o.id = j.order_id
  where j.order_id = v_job_record.order_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: Liquidar compra (Settle atÃ³mico: capture en Ã©xito, release en rechazo)
-- Bloquea billetera y luego orden. Ã‰xito descuenta total y held; Fallo libera held.
-- ------------------------------------------------------------------------------
create or replace function public.settle_purchase(
  p_order_id uuid,
  p_lease_token uuid,
  p_outcome text, -- 'succeeded' | 'failed' | 'pending_reconciliation'
  p_provider_reference text default null,
  p_failure_code text default null,
  p_digital_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.purchase_jobs;
  v_order public.orders;
  v_wallet public.wallets;
begin
  if p_outcome not in ('succeeded', 'failed', 'pending_reconciliation') then
    raise exception 'Resultado no reconocido: %', p_outcome using errcode = '22023';
  end if;

  -- 1. Verificar lease del job
  select * into v_job
  from public.purchase_jobs
  where order_id = p_order_id
  for update;

  if v_job.order_id is null then
    raise exception 'Trabajo no encontrado para la orden %', p_order_id using errcode = 'P0002';
  end if;

  -- Solo verificar token si no estÃ¡ en conciliaciÃ³n manual
  if v_job.lease_token is distinct from p_lease_token and v_job.state = 'leased' and v_job.lease_until >= now() then
    raise exception 'Token de lease invÃ¡lido o vencido' using errcode = 'P0003';
  end if;

  -- 2. Bloquear billetera primero (Mismo orden en todo el sistema)
  select w.* into v_wallet
  from public.orders o
  join public.wallets w on w.id = o.wallet_id
  where o.id = p_order_id
  for update of w;

  -- 3. Bloquear orden
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  -- Si la orden ya estaba finalizada, retornar idempotente
  if v_order.status in ('succeeded', 'failed') then
    return jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'order_id', v_order.id,
      'status', v_order.status
    );
  end if;

  -- 4. RamificaciÃ³n segÃºn resultado del proveedor
  if p_outcome = 'succeeded' then
    -- Ã‰xito confirmado: Reducir total y held, registrar 'capture'
    insert into public.transactions(
      wallet_id,
      user_id,
      currency,
      order_id,
      kind,
      amount_minor,
      balance_delta_minor,
      held_delta_minor,
      idempotency_key,
      source,
      external_reference,
      reason
    ) values (
      v_wallet.id,
      v_order.user_id,
      v_order.currency,
      v_order.id,
      'capture',
      v_order.price_minor,
      -v_order.price_minor,
      -v_order.price_minor,
      v_order.idempotency_key || '_capture',
      'purchase_settlement',
      p_provider_reference,
      coalesce(p_digital_code, 'Compra exitosa acreditada al jugador')
    );

    update public.wallets
    set balance_minor = balance_minor - v_order.price_minor,
        held_minor = held_minor - v_order.price_minor,
        updated_at = now()
    where id = v_wallet.id;

    update public.orders
    set status = 'succeeded',
        provider_reference = coalesce(p_provider_reference, provider_reference),
        finalized_at = now(),
        updated_at = now()
    where id = v_order.id;

    update public.purchase_jobs
    set state = 'done',
        lease_token = null
    where order_id = v_order.id;

  elsif p_outcome = 'failed' then
    -- Fallo definitivo confirmado: Liberar retenido (sin tocar balance total), registrar 'release'
    insert into public.transactions(
      wallet_id,
      user_id,
      currency,
      order_id,
      kind,
      amount_minor,
      balance_delta_minor,
      held_delta_minor,
      idempotency_key,
      source,
      external_reference,
      reason
    ) values (
      v_wallet.id,
      v_order.user_id,
      v_order.currency,
      v_order.id,
      'release',
      v_order.price_minor,
      0,
      -v_order.price_minor,
      v_order.idempotency_key || '_release',
      'purchase_settlement',
      p_provider_reference,
      'LiberaciÃ³n por compra fallida: ' || coalesce(p_failure_code, 'Rechazo')
    );

    update public.wallets
    set held_minor = held_minor - v_order.price_minor,
        updated_at = now()
    where id = v_wallet.id;

    update public.orders
    set status = 'failed',
        failure_code = p_failure_code,
        provider_reference = coalesce(p_provider_reference, provider_reference),
        finalized_at = now(),
        updated_at = now()
    where id = v_order.id;

    update public.purchase_jobs
    set state = 'done',
        last_error_code = p_failure_code,
        lease_token = null
    where order_id = v_order.id;

  elsif p_outcome = 'pending_reconciliation' then
    -- Estado incierto / timeout con external_id_reusable = false:
    -- Mantener retenido, marcar orden en 'pending_reconciliation' y job en 'reconcile'
    update public.orders
    set status = 'pending_reconciliation',
        failure_code = p_failure_code,
        updated_at = now()
    where id = v_order.id;

    update public.purchase_jobs
    set state = 'reconcile',
        last_error_code = p_failure_code,
        lease_token = null
    where order_id = v_order.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', p_outcome,
    'provider_reference', p_provider_reference
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. Permisos de Seguridad: Revocar de todos y conceder SOLO a service_role
-- ------------------------------------------------------------------------------
revoke all on function public.create_wallet_if_not_exists(uuid, text) from public, anon, authenticated;
revoke all on function public.credit_wallet(uuid, bigint, text, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.reserve_purchase(uuid, text, text, text, bigint, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.claim_purchase_job(integer, uuid) from public, anon, authenticated;
revoke all on function public.settle_purchase(uuid, uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.create_wallet_if_not_exists(uuid, text) to service_role;
grant execute on function public.credit_wallet(uuid, bigint, text, text, text, uuid, text, text) to service_role;
grant execute on function public.reserve_purchase(uuid, text, text, text, bigint, jsonb, text, text) to service_role;
grant execute on function public.claim_purchase_job(integer, uuid) to service_role;
grant execute on function public.settle_purchase(uuid, uuid, text, text, text, text) to service_role;

commit;



-- =========================================================
-- Migration: 202609060003_deposits_and_payment_methods.sql
-- =========================================================
-- ==============================================================================
-- MigraciÃ³n 0003: Cuentas Autorizadas, Solicitudes de DepÃ³sito y AprobaciÃ³n
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Tabla: MÃ©todos de Pago y Cuentas Bancarias Autorizadas
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

-- Ãndices
create index if not exists idx_payment_methods_active on public.payment_methods(is_active, sort_order);

-- Seed de cuentas autorizadas iniciales (Ecuador y Cripto)
insert into public.payment_methods (bank_name, account_type, account_number, account_holder, sort_order)
values
  ('BANCO DEL PACÃFICO', 'Ahorros', '1060251921', 'Kevin Guerrero', 1),
  ('BANCO GUAYAQUIL', 'Ahorros', '47761641', 'Kevin Guerrero', 2),
  ('BANCO PICHINCHA', 'Ahorros', '2200570913', 'Kevin Guerrero', 3),
  ('BINANCE PAY (USDT)', 'Pay ID', '281449411', 'XTREMEPLAY', 4),
  ('PAYPAL', 'Transferencia USD', 'pagos@xtremeplay.me', 'XtremePlay Global', 5)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 2. Tabla: Solicitudes de DepÃ³sito y Vouchers
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

-- Ãndices
create index if not exists idx_deposit_requests_user on public.deposit_requests(user_id, created_at desc);
create index if not exists idx_deposit_requests_status on public.deposit_requests(status, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ------------------------------------------------------------------------------
alter table public.payment_methods enable row level security;
alter table public.deposit_requests enable row level security;

-- Payment methods: lectura pÃºblica para cuentas activas
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
-- 4. RPC: Aprobar DepÃ³sito y Acreditar Saldo de Forma AtÃ³mica
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
    raise exception 'Solicitud de depÃ³sito % no encontrada.', p_request_id;
  end if;

  if v_req.status != 'pending' then
    raise exception 'La solicitud % ya fue procesada anteriormente (estado: %).', p_request_id, v_req.status;
  end if;

  -- 2. Ejecutar acreditaciÃ³n atÃ³mica en la billetera
  v_credit_res := public.credit_wallet(
    p_user_id := v_req.user_id,
    p_amount_minor := v_req.amount_cents,
    p_currency := v_req.currency,
    p_idempotency_key := 'DEP-' || v_req.id::text,
    p_reason := 'DepÃ³sito bancario aprobado: ' || v_req.bank_name || ' (Ref: ' || v_req.reference_number || ')',
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
-- 5. RPC: Rechazar DepÃ³sito con Motivo
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
    raise exception 'Solicitud de depÃ³sito % no encontrada.', p_request_id;
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



-- =========================================================
-- Migration: 202609060004_settings_reseller_pvp_rewards.sql
-- =========================================================
-- ==============================================================================
-- MigraciÃ³n 0004: ConfiguraciÃ³n Global, Circuit Breaker, Precios PVP y Recompensas
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Ampliar profiles con cÃ³digo de referido y datos de contacto
-- ------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists referral_code text unique;

-- FunciÃ³n generadora de cÃ³digos de socio XP-XXXXXX
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

-- Asignar cÃ³digos a perfiles existentes que no tengan uno
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

-- ------------------------------------------------------------------------------
-- 2. Tabla: ConfiguraciÃ³n Global del Sistema (Singleton)
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

-- Insertar configuraciÃ³n inicial por defecto si no existe
insert into public.system_settings (id, canjea_warning_threshold_cents, canjea_critical_threshold_cents, circuit_breaker_override, rewards_enabled, referral_commission_percent)
values ('singleton', 5000, 500, 'auto', true, 1.00)
on conflict (id) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "Todos pueden leer la configuraciÃ³n del sistema" on public.system_settings;
create policy "Todos pueden leer la configuraciÃ³n del sistema"
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
  ('DesafÃ­o de Bienvenida', 'Acumula tus primeros $25.00 en recargas y recibe un bono directo a tu saldo.', 2500, 100, null, 'sparkles', true),
  ('Maestro Free Fire', 'Alcanza $100.00 en recargas exclusivas de Free Fire durante el mes.', 10000, 350, 'free-fire', 'fire', true),
  ('Gamer Ã‰lite VIP', 'Alcanza $300.00 en recargas totales de cualquier juego para desbloquear comisiones VIP.', 30000, 1200, null, 'crown', true)
on conflict do nothing;

commit;



-- =========================================================
-- Migration: 202609060005_catalog_overrides_and_promotions.sql
-- =========================================================
-- ==============================================================================
-- MigraciÃ³n 0005: PersonalizaciÃ³n de ImÃ¡genes de Productos y Sistema de Promociones
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Tabla: PersonalizaciÃ³n de Juegos y Portadas (Admin Overrides)
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

drop policy if exists "Lectura pÃºblica de personalizaciones de catÃ¡logo" on public.catalog_game_overrides;
create policy "Lectura pÃºblica de personalizaciones de catÃ¡logo"
  on public.catalog_game_overrides
  for select
  using (true);

-- ------------------------------------------------------------------------------
-- 2. Tabla: Sistema de Avisos de Promociones y CampaÃ±as
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
    'ðŸ”¥ Â¡Semana del Diamante Free Fire!',
    'Disfruta de tarifas preferenciales en todos los paquetes de Free Fire LATAM con entrega automatizada en menos de 60 segundos.',
    'HOT PROMO',
    '/catalog',
    'Ir a la Tienda',
    'top_banner',
    true
  ),
  (
    'âš¡ Bono del 5% en DepÃ³sitos Bancarios Mayores a $50',
    'Reporta tu pago a Banco Pichincha, Guayaquil o PacÃ­fico y recibe 5% de saldo adicional acreditado directamente por administraciÃ³n.',
    'BONO SALDO',
    '/wallet/deposit',
    'Recargar Saldo',
    'hero',
    true
  )
on conflict do nothing;

commit;



-- =========================================================
-- Migration: 202609060006_provider_synced_products.sql
-- =========================================================
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



-- =========================================================
-- Migration: 202609060006_seed_dev_users.sql
-- =========================================================
-- Seed initial dev admin and reseller users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'authenticated',
      'authenticated',
      'admin@xtremeplay.me',
      '',
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Super Admin XtremePlay"}',
      now(),
      now()
    );
    UPDATE public.profiles SET role = 'admin', full_name = 'Super Admin XtremePlay' WHERE id = '00000000-0000-0000-0000-000000000001';
    INSERT INTO public.wallets (user_id, currency, balance_minor)
    VALUES ('00000000-0000-0000-0000-000000000001', 'USD', 500000)
    ON CONFLICT (user_id, currency) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'authenticated',
      'authenticated',
      'reseller@xtremeplay.me',
      '',
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Reseller Gamer Pro"}',
      now(),
      now()
    );
    UPDATE public.profiles SET role = 'client', full_name = 'Reseller Gamer Pro' WHERE id = '00000000-0000-0000-0000-000000000002';
    INSERT INTO public.wallets (user_id, currency, balance_minor)
    VALUES ('00000000-0000-0000-0000-000000000002', 'USD', 12550)
    ON CONFLICT (user_id, currency) DO NOTHING;
  END IF;
END $$;



-- =========================================================
-- Migration: 202609060007_admin_audit_logs.sql
-- =========================================================
-- ==============================================================================
-- MigraciÃ³n 0007: BitÃ¡cora Inmutable de AuditorÃ­a para Acciones Administrativas
-- ==============================================================================

begin;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_admin on public.admin_audit_logs(admin_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Solo administradores pueden leer bitacora de auditoria" on public.admin_audit_logs;
create policy "Solo administradores pueden leer bitacora de auditoria"
  on public.admin_audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

commit;



-- =========================================================
-- Migration: 202609060008_admin_enhancements_2fa_helpdesk.sql
-- =========================================================
-- ==============================================================================
-- MigraciÃ³n 0008: Mejoras Administrativas, 2FA, Mesa de Ayuda y Materiales
-- ==============================================================================

begin;

-- 1. Ampliar profiles con columnas para 2FA y otorgar permisos de actualizaciÃ³n a service_role
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
  ('Kit de Banners Redes Sociales', 'Pack de imÃ¡genes en alta definiciÃ³n listas para historias de WhatsApp, Instagram y Facebook.', 'banner', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000', 'ZIP', 12.50, true, 1),
  ('Manual Oficial del Revendedor Gamer', 'GuÃ­a completa paso a paso para ubicar IDs de jugador, servidores y verificaciÃ³n de recargas.', 'guide', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'PDF', 2.10, true, 2),
  ('Plantilla de Precios PVP Editable', 'Formato Excel y Canva para colocar tus propios precios de venta al pÃºblico y mÃ¡rgenes.', 'pricing_template', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'XLSX', 1.40, true, 3)
ON CONFLICT DO NOTHING;

-- 7. Sembrar ticket de prueba inicial
INSERT INTO public.support_tickets (user_id, user_email, subject, category, message, priority, status, admin_reply)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    'edward.otsutsuki@gmail.com',
    'Consulta sobre acreditaciÃ³n de depÃ³sito Banco Pichincha',
    'deposit_inquiry',
    'Hola administraciÃ³n, acabo de registrar un depÃ³sito por $50 y adjuntÃ© mi voucher comprobante. Quedo atento a la acreditaciÃ³n.',
    'normal',
    'resolved',
    'Hola Edward, tu depÃ³sito fue validado y acreditado a tu saldo virtual. Â¡Buenas ventas!'
  )
ON CONFLICT DO NOTHING;

commit;



