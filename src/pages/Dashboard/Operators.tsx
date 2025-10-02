import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

const Operators = () => {
  const { memberships } = useAuth();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const canCreateOperators = memberships.some(
    (m) => m.role === 'organizer_admin' || m.role === 'admin_saas'
  );

  const currentTenant = memberships[0]?.tenantId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant) {
      toast({
        title: 'Erro',
        description: 'Nenhum tenant associado à sua conta',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setTempPassword('');

    try {
      const response = await adminService.createOperator({
        email,
        nome,
        tenantId: currentTenant,
      });

      setTempPassword(response.tempPassword);
      setEmail('');
      setNome('');

      toast({
        title: 'Operador criado com sucesso',
        description: `Usuário: ${email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar operador',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canCreateOperators) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para criar operadores
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Operador de Check-in</CardTitle>
          <CardDescription>
            Preencha os dados para criar um novo operador
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tempPassword && (
            <Alert className="mb-4">
              <AlertDescription>
                <strong>Senha temporária:</strong> {tempPassword}
                <br />
                <span className="text-sm text-muted-foreground">
                  Anote esta senha e oriente o operador a alterá-la no primeiro login.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Nome do operador"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="operador@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Operador'}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = '/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Operators;
