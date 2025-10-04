import { ComponentType, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
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
    return <Component {...(props as any)} />;
  };
}
