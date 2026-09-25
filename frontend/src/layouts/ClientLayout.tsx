import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PartnerSidebar } from '../modules/client/components/PartnerSidebar';
import { PartnerTopBar } from '../modules/client/components/PartnerTopBar';
import { PromotionsBanner } from '../components/organisms/PromotionsBanner';
import { CartDrawer } from '../components/organisms/CartDrawer';
import { MobileClientBottomNav } from '../components/organisms/MobileClientBottomNav';
import { PlayerVerificationModal } from '../modules/client/components/PlayerVerificationModal';
import { CashierPinModal } from '../modules/client/components/CashierPinModal';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ClientLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast, hideToast } = useUIStore();
  const { isCashier } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Si es cajero, confinarlo estrictamente a la pantalla de enviar recargas (/catalog)
  useEffect(() => {
    if (isCashier && location.pathname !== '/catalog') {
      navigate('/catalog', { replace: true });
    }
  }, [isCashier, location.pathname, navigate]);

  // Reset scroll to top on route change to prevent jumping or sliding down
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isNative = Capacitor.isNativePlatform();

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100 flex overflow-x-hidden">
      {/* Vertical Gamer Sidebar (Completamente invisible para cajeros) */}
      {!isCashier && (
        <PartnerSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Viewport: Ancho completo cuando está el cajero */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full max-w-full overflow-x-hidden ${
          isCashier ? 'pl-0' : 'lg:pl-64'
        }`}
      >
        {/* Active Promotions Announcement Banner (Oculto para cajeros y móviles) */}
        {!isNative && !isCashier && (
          <div className="hidden md:block">
            <PromotionsBanner />
          </div>
        )}

        {/* Top Header Bar */}
        <PartnerTopBar onOpenSidebar={() => setIsSidebarOpen(true)} />

        {/* Dynamic Page Content: Espacio exclusivo de trabajo para emitir recargas */}
        <main
          className={`flex-1 p-3 sm:p-6 lg:p-8 max-w-[1800px] w-full mx-auto overflow-x-hidden ${
            isCashier ? 'pb-8' : 'pb-28 lg:pb-8'
          }`}
        >
          <Outlet />
        </main>

        {/* Global Modals & Drawers */}
        <CartDrawer />
        <PlayerVerificationModal />
        {!isCashier && <CashierPinModal />}

        {/* Mobile & Native Floating Bottom Navigation Dock (Oculto para cajeros) */}
        {!isCashier && <MobileClientBottomNav />}

        {/* Global Toast Notification */}
        {toast.isOpen && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
            <div className="glass-panel-glow px-4 py-3 rounded-2xl flex items-center gap-3 border border-slate-700 shadow-2xl">
              {getToastIcon()}
              <span className="text-xs font-semibold text-white">{toast.message}</span>
              <button
                onClick={hideToast}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-800/60 py-6 bg-[#060a12] text-center text-xs text-slate-400">
          <div className="max-w-[1800px] mx-auto px-4 space-y-1">
            <p className="font-bold text-slate-300 font-['Rajdhani'] tracking-wider uppercase">
              Recargas Juegos Online &bull; Partner Panel para Revendedores de Juegos
            </p>
            <p className="text-[11px] text-slate-400">
              Despacho en vivo con verificación oficial &bull; Acreditación inmediata 24/7
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
