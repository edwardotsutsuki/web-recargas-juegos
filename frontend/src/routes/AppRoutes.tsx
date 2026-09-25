import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useAuthStore } from '../store/useAuthStore';
import { ClientLayout } from '../layouts/ClientLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Client / Partner Pages
import { LandingPage } from '../modules/client/pages/LandingPage';
import { PartnerDashboardPage } from '../modules/client/pages/PartnerDashboardPage';
import { CatalogPage } from '../modules/client/pages/CatalogPage';
import { OrdersHistoryPage } from '../modules/client/pages/OrdersHistoryPage';
import { PartnerProfilePage } from '../modules/client/pages/PartnerProfilePage';
import { DepositPage } from '../modules/client/pages/DepositPage';
import { WalletHistoryPage } from '../modules/client/pages/WalletHistoryPage';
import { RewardsPage } from '../modules/client/pages/RewardsPage';
import { ReferralsPage } from '../modules/client/pages/ReferralsPage';
import { SupportPage } from '../modules/client/pages/SupportPage';
import { DownloadsPage } from '../modules/client/pages/DownloadsPage';
import { AccountingBookPage } from '../modules/client/pages/AccountingBookPage';
import { ResellerPvpPage } from '../modules/client/pages/ResellerPvpPage';
import { StaffManagementPage } from '../modules/client/pages/StaffManagementPage';

// Admin Isolated Pages
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';
import { UsersManagementPage } from '../modules/admin/pages/UsersManagementPage';
import { GlobalOrdersPage } from '../modules/admin/pages/GlobalOrdersPage';
import { AdminDepositsPage } from '../modules/admin/pages/AdminDepositsPage';
import { AdminSettingsPage } from '../modules/admin/pages/AdminSettingsPage';
import { AdminCatalogPage } from '../modules/admin/pages/AdminCatalogPage';
import { AdminPromotionsPage } from '../modules/admin/pages/AdminPromotionsPage';
import { AdminRewardsPage } from '../modules/admin/pages/AdminRewardsPage';
import { AdminAuditLogsPage } from '../modules/admin/pages/AdminAuditLogsPage';
import { AdminMaterialsPage } from '../modules/admin/pages/AdminMaterialsPage';
import { AdminSupportPage } from '../modules/admin/pages/AdminSupportPage';
import { AdminBankAccountsPage } from '../modules/admin/pages/AdminBankAccountsPage';

// Auth & Guards
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RegisterPage } from '../modules/auth/pages/RegisterPage';
import { AdminLoginPage } from '../modules/auth/pages/AdminLoginPage';
import { TerminalLoginPage } from '../modules/auth/pages/TerminalLoginPage';
import { AuthGuard } from '../modules/auth/guards/AuthGuard';
import { RoleGuard } from '../modules/auth/guards/RoleGuard';
import { NotFoundPage } from '../components/pages/NotFoundPage';

/**
 * Gestor de la pantalla inicial:
 * - En la WEB: Muestra la Landing Page pública (catálogo y publicidad).
 * - En la APK de Clientes: Va directamente al Login (o al Dashboard si ya inició sesión).
 * - En la APK de Admin: Va directamente al Login de Administrador (o al Panel Admin).
 */
const InitialRoute: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const [appId, setAppId] = useState<string | null>(null);
  const [isCheckingApp, setIsCheckingApp] = useState(Capacitor.isNativePlatform());

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapApp.getInfo()
        .then((info) => {
          setAppId(info.id);
        })
        .catch(() => {})
        .finally(() => {
          setIsCheckingApp(false);
        });
    }
  }, []);

  // Si estamos en un navegador web convencional (PC o móvil), mostrar Landing Page pública
  if (!Capacitor.isNativePlatform()) {
    return <LandingPage />;
  }

  // Pantalla de carga mientras se inicializa la sesión o se consulta el ID de la app
  if (isLoading || isCheckingApp) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  // 🛡️ Si es la APK de Administrador (com.recargasjuegos.admin)
  if (appId === 'com.recargasjuegos.admin') {
    if (isAuthenticated && role === 'admin') {
      return <Navigate to="/sys-admin-auth" replace />;
    }
    return <AdminLoginPage />;
  }

  // 📱 Si es la APK de Clientes (com.recargasjuegos.app)
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 🚀 1. Ruta Inicial: Landing en Web, Login directo sin publicidad en APKs */}
      <Route path="/" element={<InitialRoute />} />
      <Route path="/deposit" element={<Navigate to="/wallet/deposit" replace />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/terminal" element={<TerminalLoginPage />} />
      <Route path="/pos" element={<Navigate to="/terminal" replace />} />
      <Route path="/sys-admin-auth/login" element={<AdminLoginPage />} />

      {/* 🛡️ Partner Panel (Client Layout) - Protected with AuthGuard */}
      <Route
        element={
          <AuthGuard>
            <ClientLayout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<PartnerDashboardPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/reseller/pvp" element={<ResellerPvpPage />} />
        <Route path="/reseller-pvp" element={<Navigate to="/reseller/pvp" replace />} />
        <Route path="/staff" element={<StaffManagementPage />} />
        <Route path="/reseller/staff" element={<Navigate to="/staff" replace />} />
        <Route path="/orders" element={<OrdersHistoryPage />} />
        <Route path="/profile" element={<PartnerProfilePage />} />
        <Route path="/wallet/deposit" element={<DepositPage />} />
        <Route path="/wallet/history" element={<WalletHistoryPage />} />
        <Route path="/accounting" element={<AccountingBookPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
      </Route>

      {/* 🔐 Admin Isolated Protected Area: Acceso únicamente vía ruta secreta */}
      <Route
        path="/sys-admin-auth"
        element={
          <RoleGuard requiredRole="admin">
            <AdminLayout />
          </RoleGuard>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="deposits" element={<AdminDepositsPage />} />
        <Route path="bank-accounts" element={<AdminBankAccountsPage />} />
        <Route path="catalog" element={<AdminCatalogPage />} />
        <Route path="materials" element={<AdminMaterialsPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
        <Route path="rewards" element={<AdminRewardsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="orders" element={<GlobalOrdersPage />} />
        <Route path="audit" element={<AdminAuditLogsPage />} />
      </Route>

      {/* Bloqueo discreto de /admin tradicional para evitar escaneos */}
      <Route path="/admin/*" element={<NotFoundPage />} />
      <Route path="/admin" element={<NotFoundPage />} />

      {/* Catch-all 404 Discreto */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
