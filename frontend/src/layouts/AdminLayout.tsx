import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminTopBar } from '../components/organisms/AdminTopBar';
import { AdminSidebar } from '../components/organisms/AdminSidebar';
import { MobileAdminBottomNav } from '../components/organisms/MobileAdminBottomNav';
import { nativeNotificationService } from '../services/nativeNotificationService';
import { useUIStore } from '../store/useUIStore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { toast, hideToast } = useUIStore();
  const location = useLocation();

  // Scroll reset to top on navigation to prevent page from jumping down
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    nativeNotificationService.init();
  }, []);

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
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 overflow-x-hidden">
      <AdminTopBar />

      <div className="flex-1 flex flex-col md:flex-row w-full max-w-full overflow-x-hidden">
        {/* Admin Navigation Sidebar (Visible en desktop) */}
        <AdminSidebar />

        {/* Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl overflow-x-hidden pb-28 md:pb-8 w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile & Native Floating Admin Bottom Navigation Dock */}
      <MobileAdminBottomNav />

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
    </div>
  );
};

