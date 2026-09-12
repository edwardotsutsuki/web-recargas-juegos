-- ==============================================================================
-- Migración 0007: Bitácora Inmutable de Auditoría para Acciones Administrativas
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

