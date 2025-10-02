import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login',
}) => {
  const { user, memberships, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole) {
    const hasRole = memberships.some((m) => m.role === requiredRole);
    if (!hasRole) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-foreground">Acesso Negado</h1>
            <p className="mb-4 text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
            <a href="/login" className="text-primary hover:underline">
              Voltar ao login
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
