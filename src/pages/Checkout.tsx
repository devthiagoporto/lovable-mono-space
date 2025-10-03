import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { eventService, Event } from '@/services/events';
import { lotService, Lot } from '@/services/lots';
import { ticketTypeService } from '@/services/ticketTypes';
import { cartService, CartItem } from '@/services/cart';
import { orderService } from '@/services/orders';
import { ticketService } from '@/services/tickets';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/utils/currency';
import { formatCPF } from '@/lib/utils/cpf';
import { ArrowLeft, CreditCard, Lock, ShoppingCart } from 'lucide-react';
import { z } from 'zod';

const checkoutSchema = z.object({
  cpf: z.string().min(14, 'CPF inválido'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface CartItemWithDetails extends CartItem {
  lotName: string;
  ticketTypeName: string;
  price: number;
}

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [cartItems, setCartItems] = useState<CartItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Dados do comprador
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Login/Registro
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const eventId = searchParams.get('eventId');
      const cartData = searchParams.get('cart');

      if (!eventId || !cartData) {
        toast({
          title: 'Erro',
          description: 'Dados do carrinho inválidos',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      const cart = JSON.parse(decodeURIComponent(cartData));
      const eventData = await eventService.getPublicEvent(eventId);
      setEvent(eventData);

      // Carregar detalhes dos lotes
      const itemsWithDetails: CartItemWithDetails[] = await Promise.all(
        cart.map(async (item: CartItem) => {
          const lot = await lotService.getById(item.lotId);
          const ticketType = await ticketTypeService.getById(lot.ticket_type_id);
          return {
            ...item,
            lotName: lot.nome,
            ticketTypeName: ticketType.nome,
            price: lot.preco,
          };
        })
      );

      setCartItems(itemsWithDetails);
    } catch (error) {
      console.error('Error loading checkout:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do checkout',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
      
      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      const { error } = await signIn(loginEmail, loginPassword);

      if (error) {
        toast({
          title: 'Erro ao fazer login',
          description: error.message || 'Credenciais inválidas',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      toast({
        title: 'Login realizado',
        description: 'Agora você pode finalizar a compra',
      });
      setProcessing(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const validation = signupSchema.safeParse({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });

      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      const { error } = await signUp(signupEmail, signupPassword, signupName);

      if (error) {
        toast({
          title: 'Erro ao criar conta',
          description: error.message || 'Não foi possível criar sua conta',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      toast({
        title: 'Conta criada!',
        description: 'Agora você pode finalizar a compra',
      });
      setProcessing(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  const handleFinalizePurchase = async () => {
    if (!event) return;

    // Validar dados primeiro
    const validation = checkoutSchema.safeParse({
      cpf: buyerCpf,
      name: buyerName,
      email: buyerEmail,
    });

    if (!validation.success) {
      toast({
        title: 'Dados incompletos',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    // Se não estiver logado, mostrar opção de login/cadastro
    if (!user) {
      setShowAuth(true);
      toast({
        title: 'Quase lá!',
        description: 'Faça login ou crie uma conta para finalizar sua compra',
      });
      return;
    }

    setProcessing(true);

    try {
      // Import checkout service
      const { checkoutService } = await import('@/services/checkout');

      // Prepare checkout items
      const items = cartItems.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        lotId: item.lotId,
        quantity: item.quantity,
      }));

      // Create checkout session
      const result = await checkoutService.create(event.tenant_id, {
        eventId: event.id,
        items,
        successUrl: `${window.location.origin}/success?orderId={ORDER_ID}`,
        cancelUrl: `${window.location.origin}/checkout?eventId=${event.id}&cart=${encodeURIComponent(JSON.stringify(cartItems))}`,
        buyerEmail,
      });

      if (!result.ok) {
        throw new Error(result.message || 'Failed to create checkout');
      }

      // Redirect to payment provider (Stripe)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando checkout...</p>
      </div>
    );
  }

  const totalValue = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8">
      <div className="container mx-auto px-4">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to={`/e/${event?.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao evento
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          {/* Formulário principal */}
          <div className="space-y-6">
            {/* Dados do comprador - sempre visível */}
            <Card>
              <CardHeader>
                <CardTitle>Dados do Comprador</CardTitle>
                <CardDescription>
                  Preencha seus dados para continuar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="João Silva"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={buyerCpf}
                    onChange={(e) => setBuyerCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coupon">Cupom de desconto (opcional)</Label>
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite o código"
                    className="uppercase"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Autenticação - só aparece quando necessário */}
            {(showAuth || user) && (
              <Card className="border-2 border-primary/50">
                <CardHeader>
                  <CardTitle>
                    {user ? '✓ Você está logado' : 'Login ou Cadastro'}
                  </CardTitle>
                  <CardDescription>
                    {user
                      ? `Logado como: ${user.email}`
                      : 'Para finalizar sua compra, faça login ou crie uma conta'}
                  </CardDescription>
                </CardHeader>
                {!user && (
                  <CardContent>
                    <Tabs defaultValue="login">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Entrar</TabsTrigger>
                        <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                      </TabsList>

                      <TabsContent value="login">
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-email">E-mail</Label>
                            <Input
                              id="login-email"
                              type="email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              required
                              disabled={processing}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="login-password">Senha</Label>
                            <Input
                              id="login-password"
                              type="password"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              required
                              disabled={processing}
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Entrando...' : 'Entrar'}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="signup">
                        <form onSubmit={handleSignup} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-name">Nome completo</Label>
                            <Input
                              id="signup-name"
                              type="text"
                              value={signupName}
                              onChange={(e) => setSignupName(e.target.value)}
                              required
                              disabled={processing}
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-email">E-mail</Label>
                            <Input
                              id="signup-email"
                              type="email"
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              required
                              disabled={processing}
                              maxLength={255}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-password">Senha</Label>
                            <Input
                              id="signup-password"
                              type="password"
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              required
                              disabled={processing}
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-confirm">Confirmar senha</Label>
                            <Input
                              id="signup-confirm"
                              type="password"
                              value={signupConfirmPassword}
                              onChange={(e) => setSignupConfirmPassword(e.target.value)}
                              required
                              disabled={processing}
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Criando...' : 'Criar conta'}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Resumo do pedido */}
          <div className="lg:sticky lg:top-4 lg:h-fit">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Evento */}
                {event && (
                  <div className="pb-4 border-b">
                    <h3 className="font-semibold text-lg mb-1">{event.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{event.local}</p>
                  </div>
                )}

                {/* Itens */}
                <div className="space-y-3">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.quantity}x {item.ticketTypeName}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.lotName}</p>
                      </div>
                      <span className="font-semibold">
                        {formatBRL(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-mono font-bold text-primary">
                      {formatBRL(totalValue)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Taxas podem ser aplicadas
                  </p>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={handleFinalizePurchase}
                  disabled={processing}
                  size="lg"
                >
                  {processing ? (
                    'Processando...'
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      {user ? 'Finalizar Compra' : 'Continuar'}
                    </>
                  )}
                </Button>

                {!user && (
                  <p className="text-center text-xs text-muted-foreground">
                    Você poderá fazer login ou cadastro na próxima etapa
                  </p>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Lock className="h-3 w-3" />
                  <span>Pagamento 100% seguro</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
