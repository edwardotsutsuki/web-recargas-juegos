# Revisión de Supabase en producción

Fecha: 2026-09-23. Proyecto: `pemkocaufntsbicnzziz`.

Revisión mediante MCP en modo de solo lectura. No se ejecutaron compras,
acreditaciones, aprobaciones ni modificaciones de datos o permisos.

## Hallazgos prioritarios

1. **RPC monetarias accesibles sin autenticación.** Los permisos efectivos
   permiten a `anon` y `authenticated` ejecutar ambas variantes de
   `credit_wallet`, `approve_deposit_request` y ambas variantes de
   `settle_purchase`. Las definiciones inspeccionadas de `credit_wallet` y
   `approve_deposit_request` son SECURITY DEFINER y no validan la identidad o
   el rol del llamante. Restringir las RPC del backend a `service_role`,
   considerando todas las sobrecargas. No se intentó explotar esta exposición.

2. **Actualización del rol propio.** `authenticated` tiene UPDATE sobre
   `profiles.role`; las políticas permiten actualizar el perfil propio.
   El único trigger de usuario observado en profiles es BEFORE INSERT para
   asignar el código de referido. Los controles inspeccionados permiten que
   un cliente cambie su rol. Restringir columnas editables por el cliente;
   el backend administra roles con su credencial de servicio.

3. **Lectura de perfiles y secretos 2FA.** `profiles_read_policy` permite
   SELECT con condición `true` a authenticated y este rol tiene SELECT sobre
   `two_factor_secret`. Esa política amplía la política de lectura propia.
   Eliminar la lectura global y separar/restringir los secretos del perfil
   que consume el frontend. No se consultaron valores de secretos.

4. **Depósitos editables por su propietario.** Una política permisiva ALL
   convive con la política de actualización de administradores. El rol
   authenticated tiene UPDATE de status y DELETE. La política amplia permite
   modificar/eliminar depósitos propios; no demuestra por sí sola que esos
   cambios acrediten saldo. Restringir las operaciones del cliente al flujo
   necesario y gestionar la aprobación únicamente desde el backend.

## Compatibilidad y funcionamiento

- La función online `approve_deposit_request(uuid, uuid)` acepta dos
  parámetros. El repositorio local envía también `p_compressed_voucher_url`
  y `p_voucher_hash`: hay que alinear el contrato y conservar esos metadatos.
- El listado global de pedidos solicita `profiles(email)`, columna ausente.
  La consulta REST de validación con limit=0 devolvió error 42703.
- La publicación `supabase_realtime` existe, no publica todas las tablas y
  no tiene tablas asociadas. Las suscripciones postgres_changes locales de
  wallets/orders requieren configurar esa publicación.
- `list_migrations` devuelve una lista vacía. Hay esquema online, pero no
  historial de migraciones registrado; esto no permite fechar ni reconstruir
  por sí solo las ejecuciones realizadas en el editor SQL.
- Hay dos archivos locales con versión `202609060006` y scripts globales
  que usan columnas distintas del esquema remoto. No ejecutar un reset ni
  reenviar todos los scripts para intentar sincronizar.

## Orden propuesto

1. Preparar una migración específica de permisos y políticas, verificando las
   operaciones de perfil, depósitos y 2FA que necesita el frontend.
2. Probarla en un entorno aislado con roles anon, authenticated y service_role.
3. Aplicarla por una conexión autorizada para escritura y verificar permisos.
4. Alinear contratos de depósitos y pedidos; configurar Realtime.
5. Establecer una línea base del esquema real y un historial reproducible de
   migraciones antes de comenzar la nueva app móvil.

El MCP actual es de solo lectura. Este documento no aplica correcciones.

## Avisos adicionales de Supabase

- Dos funciones de referidos tienen search_path mutable.
- Hay cinco claves foráneas sin índice de cobertura y políticas duplicadas.
- purchase_jobs tiene RLS sin políticas: puede ser intencional para una cola
  interna accesible únicamente por el backend; no habilitar acceso público.

Referencias de los asesores:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
