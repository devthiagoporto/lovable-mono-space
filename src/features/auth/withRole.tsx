import { ComponentType, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function withRole(requiredRole: string) {
  return function <P extends object>(Component: ComponentType<P>) {
    return function RoleProtectedComponent(props: P) {
      const { user, memberships, loading } = useAuth();
      const navigate = useNavigate();

      useEffect(() => {
        if (!loading && !user) {
          navigate('/login', { replace: true });
        }
      }, [user, loading, navigate]);

      if (loading) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        );
      }

      if (!user) return null;
      const hasRole = (memberships ?? []).some((m) => m.role === requiredRole);
      if (!hasRole) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold">Acesso Negado</h1>
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
      return <Component {...(props as any)} />;
    };
  };
}
