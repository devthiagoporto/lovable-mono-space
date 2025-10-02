import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const { user, memberships, signOut } = useAuth();

  const canManageOperators = memberships.some(
    (m) => m.role === 'organizer_admin' || m.role === 'admin_saas'
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Bem-vindo, {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Seus Tenants:</h3>
            <ul className="space-y-1">
              {memberships.map((m, idx) => (
                <li key={idx} className="text-sm">
                  {m.tenantName} - <span className="text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => (window.location.href = '/dashboard/events')}
              className="w-full"
            >
              Gerenciar Eventos
            </Button>

            {canManageOperators && (
              <Button
                onClick={() => (window.location.href = '/dashboard/operators')}
                className="w-full"
                variant="outline"
              >
                Gerenciar Operadores
              </Button>
            )}
          </div>

          <div>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full"
            >
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
