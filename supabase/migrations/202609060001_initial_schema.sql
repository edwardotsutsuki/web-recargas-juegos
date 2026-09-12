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
-- Una orden jamás puede tener simultáneamente captura y liberación.
create unique index transactions_order_final_idx on public.transactions(order_id) where kind in ('capture', 'release');
create unique index transactions_credit_reference_idx on public.transactions(source, external_reference)
  where kind = 'credit' and external_reference is not null;
create index transactions_user_created_idx on public.transactions(user_id, created_at desc);

-- Cola persistente para desacoplar la retención del envío al proveedor.
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

-- No se habilitan escrituras de dinero hasta implementar las RPC atómicas
-- descritas en docs/architecture.md. service_role tampoco tiene DML directo.
commit;
