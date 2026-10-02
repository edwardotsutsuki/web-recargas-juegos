# Verificación de Puntos Pendientes

## 1. Archivos de Órdenes en Frontend
- `frontend\src\modules\admin\pages\GlobalOrdersPage.tsx`
- `frontend\src\modules\client\pages\OrdersHistoryPage.tsx`
- `frontend\src\services\api\orders.service.ts`

## 2. Detección de Soporte de PIN / Voucher
Archivos que ya mencionan PIN / Voucher (8):
- `frontend\src\modules\admin\pages\AdminDepositsPage.tsx`
- `frontend\src\modules\auth\pages\TerminalLoginPage.tsx`
- `frontend\src\modules\client\pages\DepositPage.tsx`
- `frontend\src\modules\client\pages\StaffManagementPage.tsx`
- `frontend\src\modules\client\pages\SupportPage.tsx`
- `frontend\src\services\api\reseller.service.ts`
- `frontend\src\services\api\staff.service.ts`
- `frontend\src\types\index.ts`

## 3. Revisión de Cálculos en Admin
- `frontend/src/modules/admin/pages/AdminDashboardPage.tsx`: Menciona Costos: **false**, Menciona Ganancias: **false**
- `frontend/src/modules/admin/pages/AdminCatalogPage.tsx`: Menciona Costos: **true**, Menciona Ganancias: **false**

## 4. Revisión del Proveedor Canjea
- `backend\src\repositories\orderRepository.js`: Soporte de PIN/Voucher: **true**
- `backend\src\services\orderService.js`: Soporte de PIN/Voucher: **false**
- `backend\test_canjea_performance.cjs`: Soporte de PIN/Voucher: **false**
- `backend\test_canjea_skus.js`: Soporte de PIN/Voucher: **false**
- `backend\test_check_canjea_features.js`: Soporte de PIN/Voucher: **false**