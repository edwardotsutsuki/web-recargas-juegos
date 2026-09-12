import React from 'react';
import { Navigate } from 'react-router-dom';
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

  // Si no está autenticado, redirigir al login correspondiente
  if (!isAuthenticated) {
    if (requiredRole === 'admin') {
      return <Navigate to="/sys-admin-auth/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado pero no tiene el rol requerido, mostrar 404 discreto
  if (role !== requiredRole) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
};
