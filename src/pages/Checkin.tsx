import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Checkin = () => {
  const { user, memberships, signOut } = useAuth();

  const hasCheckinRole = memberships.some((m) => m.role === 'checkin_operator');

  if (!hasCheckinRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão de operador de check-in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = '/login')}
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Portal de Check-in</CardTitle>
          <CardDescription>
            Operador: {user?.email}
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

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Portal de check-in operacional. Funcionalidades de validação de ingressos serão implementadas na próxima etapa.
            </p>
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

export default Checkin;
