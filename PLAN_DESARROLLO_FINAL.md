# Plan de Desarrollo y Corrección Integral

## 1. Diagnóstico de la Verificación Realizada

### A. Estado de las 5 Órdenes en la Base de Datos
- **Confirmación:** Las 5 órdenes atascadas ya fueron marcadas en `failed` y tienen su `finalized_at` asignado.
- **Acción sobre saldos:** Validar si pertenecían a cuentas de prueba o si se requiere saldo compensatorio en la billetera de algún usuario.

### B. Soporte para Vouchers / PINs (Cambio de API del Proveedor Canjea)
- **Situación actual:** Ciertos juegos o productos de Canjea entregan PINs / Vouchers digitales directamente en el payload de la respuesta.
- **Áreas a intervenir:**
  1. **Vista de Cliente (`ClientOrdersPage` / Modal de Detalle):** 
     - Detectar si la orden tiene `voucher`, `pin`, `serial`, o `license_code` dentro de su metadata o detalles.
     - Añadir un componente visual destacado con el PIN, botón de un clic para copiar (`Copiar PIN`), y las instrucciones de canje.
  2. **Vista de Administrador (`AdminOrdersPage`):**
     - Añadir columna o badge en el modal de detalle para que el administrador pueda ver qué PIN entregó el proveedor en caso de reclamos de soporte.

### C. Consistencia de Costos y Ganancias en Panel Admin
- **Situación actual:** En el panel de clientes ya corregimos `getOrderCost` y `getOrderPvp` con cálculo en vivo.
- **Áreas a intervenir:**
  - En `AdminDashboardPage.tsx` y `AdminCatalogPage.tsx`, verificar que las métricas globales de ingresos, costos y ganancias utilicen los mismos fallbacks seguros para que ningún paquete con costo mayorista reporte `$0.00`.

---

## 2. Fases del Plan de Implementación

### Fase 1: Soporte de PINs / Vouchers en el Módulo de Cliente
- [ ] Implementar tarjeta visual de PIN / Voucher en el historial de órdenes del cliente.
- [ ] Añadir botón "Copiar PIN" con feedback háptico/toast ("¡Copiado!").
- [ ] Añadir botón / enlace a instrucciones de canje oficial del juego.

### Fase 2: Soporte de PINs / Vouchers en el Módulo de Administrador
- [ ] En la tabla y modal de detalle de órdenes globales de Admin, mostrar el campo "PIN / Licencia" entregada por el proveedor.
- [ ] Permitir filtrar o identificar órdenes de tipo "Recarga directa" vs "Entrega de Voucher/PIN".

### Fase 3: Homologación de Costos en Panel de Administración
- [ ] Auditar métricas de ganancias en `AdminDashboardPage.tsx`.
- [ ] Asegurar que el catálogo de paquetes (`AdminCatalogPage.tsx`) guarde y muestre siempre `wholesale_price` de forma consistente.

### Fase 4: Pruebas, Compilación y Despliegue
- [ ] Build limpio de TypeScript y Vite.
- [ ] Despliegue web a producción en Hostinger (`deploy_to_hostinger.cjs`).
- [ ] Sincronización en Git rama `main`.
- [ ] **Garantía Android:** Conservar intacta la configuración de apps móviles sin compilar APKs.
