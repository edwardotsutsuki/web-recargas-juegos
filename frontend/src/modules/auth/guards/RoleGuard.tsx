import React from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { UserRole } from '../../../types';
import { NotFoundPage } from '../../../components/pages/NotFoundPage';

interface RoleGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ requiredRole, children }) => {
  const { role, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Si no está autenticado o su rol no coincide, responder con 404 discreto (evita enumeración de rutas)
  if (!isAuthenticated || role !== requiredRole) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
};
