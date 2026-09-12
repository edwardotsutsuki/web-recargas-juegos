-- ==============================================================================
-- Migración 0002: RPCs Transaccionales Monetarias y Despacho Idempotente
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

  -- 3. Si viene referencia externa (ej. pasarela), verificar deduplicación
  if p_external_reference is not null then
    perform 1 from public.transactions
    where source = p_source and external_reference = p_external_reference and kind = 'credit';
    if found then
      raise exception 'Referencia externa ya procesada anteriormente' using errcode = '23505';
    end if;
  end if;

  -- 4. Registrar movimiento inmutable de crédito
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
-- 3. RPC: Reservar compra (Hold atómico + Creación de Orden y Job)
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

  -- 5. Registrar la transacción inmutable de tipo 'hold'
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
    'Retención preventiva por orden ' || v_order.id
  );

  -- 6. Incrementar el saldo retenido en la billetera
  update public.wallets
  set held_minor = v_new_held,
      updated_at = now()
  where id = v_wallet.id;

  -- 7. Crear el trabajo durable en purchase_jobs para el worker asíncrono
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
-- 5. RPC: Liquidar compra (Settle atómico: capture en éxito, release en rechazo)
-- Bloquea billetera y luego orden. Éxito descuenta total y held; Fallo libera held.
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

  -- Solo verificar token si no está en conciliación manual
  if v_job.lease_token is distinct from p_lease_token and v_job.state = 'leased' and v_job.lease_until >= now() then
    raise exception 'Token de lease inválido o vencido' using errcode = 'P0003';
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

  -- 4. Ramificación según resultado del proveedor
  if p_outcome = 'succeeded' then
    -- Éxito confirmado: Reducir total y held, registrar 'capture'
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
      'Liberación por compra fallida: ' || coalesce(p_failure_code, 'Rechazo')
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

