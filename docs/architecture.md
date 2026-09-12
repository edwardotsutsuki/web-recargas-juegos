# Arquitectura del primer entregable

Estado: esquema inicial y contenedor de bootstrap. Solo GET /health está implementado.
Las rutas de negocio, RPC monetarias y adaptadores siguientes son contratos de la próxima fase.

## Capas

```text
backend/src/
  server.js                      # arranque y cierre (implementado)
  healthcheck.js                 # comprobación del proceso (implementado)
  config/env.js                  # configuración por entorno (implementado)
  routes/                       # registro de rutas y middleware
  controllers/                  # validación HTTP y traducción de errores
  services/                     # casos de uso: compras, billeteras y administración
  repositories/                 # consultas Supabase y RPC atómicas
  middleware/                   # Auth, RBAC, rate limit y errores
  providers/                    # contrato y registro de proveedores
    canjea/                     # adaptador HTTP aislado del núcleo
  payments/                     # contrato y registro de pasarelas
  jobs/                         # despacho y conciliación de órdenes
supabase/migrations/             # esquema SQL versionado
docs/architecture.md
docker-compose.yml
.env.example
```

Flujo de dependencias: rutas → controladores → servicios → repositorios / contratos
de proveedores. Inyectar adaptadores desde el arranque. El proveedor devuelve resultados
normalizados; ningún servicio debe interpretar directamente JSON específico de Canjea.
Una pasarela futura confirma pagos mediante webhook verificado y acredita a través de
la misma RPC idempotente que utiliza administración.

## Modelo de datos

* `profiles`: identidad enlazada a `auth.users`; rol `client` por defecto. Promover el
  primer admin mediante una migración controlada por el operador, nunca con metadata del registro.
* `wallets`: una billetera por usuario y moneda. Importes `bigint` en unidades menores;
  USD usa centavos. La moneda inicial se toma de `WALLET_CURRENCY` al crear la billetera
  con una futura RPC, no se fija en el trigger de Auth.
* `orders`: precio de venta congelado desde catálogo confiable del backend, jugador,
  proveedor, estado, referencia externa e idempotencia por usuario.
* `transactions`: registro inmutable de créditos, retenciones, capturas y liberaciones.
  No es todavía un libro contable de doble partida. Correcciones futuras necesitan
  movimientos compensatorios y una migración explícita, nunca editar el historial.
* `purchase_jobs`: trabajo durable creado en la misma transacción que la retención.

Saldo disponible = saldo total − saldo retenido. Ejemplo en centavos:
10000/0 → retener 2500 → 10000/2500 → éxito → 7500/0;
con fallo confirmado → 10000/0. No usar floats. En JSON, enviar bigint como cadenas.
Guardar códigos digitales entregados en una futura tabla separada, cifrados; nunca
incluir secretos de proveedor ni respuestas completas en logs o errores del cliente.

RLS permite a cada cliente leer solamente sus filas. Incluso los administradores
acceden a métricas y recargas mediante backend; no hay políticas globales de escritura.
La clave service_role permanece exclusivamente en servidor: evita RLS, por lo que
el backend debe verificar identidad y autorización en cada operación. El esquema
revoca escrituras directas también a ese rol para impedir cambios monetarios parciales.

## Contratos transaccionales pendientes de implementar

Implementar funciones PostgreSQL `SECURITY DEFINER`, con `search_path = ''`, nombres
cualificados y permiso EXECUTE solo para service_role (revocarlo de PUBLIC). Una llamada
RPC debe completar toda la mutación; varias llamadas REST no forman una transacción.
El backend deriva el actor del token verificado, nunca del body.

1. `reserve_purchase`: bloquear billetera `FOR UPDATE`; comprobar primero si la clave
   idempotente ya existe. Mismo fingerprint devuelve la orden existente, otro devuelve
   conflicto. Validar precio, moneda, propietario y saldo disponible. Crear orden,
   incrementar retenido, registrar `hold` y crear job; commit conjunto. El fingerprint
   SHA-256 representa el payload canónico enviado por el cliente; un reintento de la
   misma solicitud conserva el precio original aunque el catálogo haya cambiado.
2. El worker reclama jobs mediante `FOR UPDATE SKIP LOCKED` con lease y token único.
   Marca `processing` y confirma antes de llamar al proveedor. Usa `order.id` como
   referencia idempotente externa únicamente si Canjea admite ese contrato.
3. `settle_purchase`: bloquear siempre billetera y luego orden (mismo orden de bloqueo
   en todas las RPC), validar transición, importe, token de lease y resultado. Éxito:
   reducir total y retenido, insertar `capture`, cerrar orden y job, todo atómico.
   Rechazo definitivo: reducir solo retenido, insertar `release`, marcar `failed` y
   cerrar job. Repetir el mismo resultado no cambia el saldo; uno contrario se rechaza.
4. Timeout, corte de conexión, respuesta ilegible o 5xx: marcar `pending_reconciliation`
   y job `reconcile`; mantener retención. Un lease vencido tras posible envío también
   requiere conciliación. No reenviar compras automáticamente sin idempotencia
   documentada. Consultar estado externo; si no hay API para ello, revisión manual.
5. `credit_wallet`: comprobar rol admin en `profiles`, bloquear billetera, validar
   moneda e importe positivo; insertar crédito con actor, motivo y clave idempotente
   e incrementar total en una transacción. Reutilizar clave con otro payload es 409.
   Para pasarelas, deduplicar además por `(source, external_reference)` tras verificar
   autenticidad y monto del pago. No aceptar al cliente como confirmación del pago.

Las restricciones SQL actuales protegen referencias e importes, pero no sustituyen
estas RPC: las transiciones y el saldo derivado del historial deben verificarse en
ellas. No habilitar escrituras de negocio antes de implementarlas y probar concurrencia.

## API acordada para frontend (propuesta, aún no implementada)

Todas salvo `/health` requieren `Authorization: Bearer <access_token>` de Supabase.
Verificar el token con Supabase Auth, no solo decodificarlo. Leer el rol en BD para RBAC.

| Método y ruta | Acceso | Contrato |
| --- | --- | --- |
| GET /catalog | client/admin | Catálogo normalizado, paginado; precio de venta y moneda |
| POST /verify-player | client/admin | productId y campos de jugador validados |
| POST /orders | client/admin | Idempotency-Key obligatorio; productId y player; 202 con orderId y status |
| GET /orders | client/admin | Solo órdenes propias, paginación por cursor |
| GET /orders/:id | propietario | Estado propio; 404 para orden ajena |
| GET /wallet | client/admin | Saldo total, retenido y disponible propios |
| POST /admin/wallets/:userId/credits | admin | Idempotency-Key, amountMinor, currency y reason |
| GET /admin/metrics | admin | Rango temporal validado; ventas exitosas, créditos y retenciones por moneda |

Errores uniformes `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
Validación 400, autenticación 401, rol 403, conflicto idempotente 409, saldo propio
insuficiente 422, límite de nuestra API 429. Problemas de saldo del proveedor son un
fallo operativo, no saldo insuficiente del cliente. Para compras ya aceptadas devolver
la orden y su estado; un 504 no debe sugerir que una compra quedó cancelada.

## Canjea

URL base configurada en CANJEA_BASE_URL. La URL proporcionada no permitió consultar
documentación pública durante este trabajo. No se han supuesto endpoints de compra,
headers de autenticación, códigos de error, idempotencia ni consulta de estado.
Confirmarlos con documentación oficial o sandbox antes de implementar el adaptador.

Contrato interno: `getCatalog`, `verifyPlayer`, `purchase`, `getPurchaseStatus` (si
está disponible). Cada intento HTTP debe usar AbortSignal con CANJEA_TIMEOUT_MS=5000,
incluyendo lectura de la respuesta. Validar la variable al inicio. Para lecturas,
reintentos limitados con backoff y jitter respetando Retry-After; para escrituras,
ningún reintento automático sin garantías del proveedor. Un 429 de compra solo
libera fondos si el contrato confirma que no se procesó; si es ambiguo, conciliar.

## Desarrollo y VPS

Este Compose ejecuta Node localmente conectado a un proyecto Supabase gestionado.
No instala Supabase local: PostgreSQL solo no reemplaza Supabase Auth. Para desarrollo
totalmente offline se necesita el stack local completo de Supabase, fuera de esta base.

Copiar `.env.example` a `.env`, completar valores y ejecutar `docker compose up --build -d`.
GET http://127.0.0.1:3000/health comprueba el proceso, no la conexión a Supabase/Canjea.
Aplicar la migración SQL una vez mediante SQL Editor de un proyecto nuevo de Supabase.
No contiene credenciales ni configuraciones específicas del entorno.

Para un VPS Hostinger con Docker: desplegar el mismo proyecto y un `.env` privado,
NODE_ENV=production, orígenes CORS explícitos, claves del proyecto de producción y
una imagen Node fijada por digest tras validación. Mantener BIND_ADDRESS=127.0.0.1
y usar proxy inverso HTTPS en el host. Configurar dominio, TLS, firewall y copias
de seguridad antes de abrir el servicio. No es una configuración para hosting compartido.
Supabase puede permanecer gestionado al mover la API; autohospedarlo requiere otro plan
de migración de datos, Auth, secretos y backups.

## Validación requerida antes de vender

Aplicar SQL en Supabase de prueba y verificar RLS entre dos usuarios, denegación de
escrituras y escalada de rol; implementar RPC y probar compras concurrentes, reintentos,
doble captura/liberación, caída antes/después del envío, rechazo y timeout del proveedor.
Comprobar que la suma de movimientos reconstruye saldo y retenciones. Esta entrega
no conecta credenciales reales ni implementa todavía esas operaciones monetarias.

Fuentes oficiales consultadas:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
