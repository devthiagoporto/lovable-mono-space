import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService, Event } from '@/services/events';
import { sectorService, Sector } from '@/services/sectors';
import { ticketTypeService, TicketType } from '@/services/ticketTypes';
import { lotService, Lot } from '@/services/lots';
import { cartService, CartItem } from '@/services/cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils/date';
import { formatBRL } from '@/lib/utils/currency';
import { formatCPF } from '@/lib/utils/cpf';
import { Calendar, MapPin, Share2, Minus, Plus, CreditCard, ArrowLeft, Ticket } from 'lucide-react';

interface LotWithType extends Lot {
  ticket_type_name: string;
  sector_name: string;
}

const EventPublic = () => {
  const { eventId } = useParams();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [lots, setLots] = useState<LotWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const [cpf, setCpf] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const [eventData, sectorsData, ticketTypesData] = await Promise.all([
        eventService.getPublicEvent(eventId!),
        sectorService.list(eventId!),
        ticketTypeService.list(eventId!),
      ]);

      setEvent(eventData);
      setSectors(sectorsData);
      setTicketTypes(ticketTypesData);

      // Load lots for all active ticket types
      const lotsPromises = ticketTypesData
        .filter((tt) => tt.ativo)
        .map((tt) => lotService.list(tt.id));
      
      const lotsResults = await Promise.all(lotsPromises);
      const allLots = lotsResults.flat();

      // Enrich lots with type and sector names
      const enrichedLots: LotWithType[] = allLots.map((lot) => {
        const ticketType = ticketTypesData.find((tt) => tt.id === lot.ticket_type_id);
        const sector = sectorsData.find((s) => s.id === ticketType?.sector_id);
        return {
          ...lot,
          ticket_type_name: ticketType?.nome || '',
          sector_name: sector?.nome || '',
        };
      });

      setLots(enrichedLots);
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: 'Erro',
        description: 'Evento não encontrado ou não está publicado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (lotId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    if (quantity < 0) return;

    setCart((prev) => {
      const newCart = { ...prev };
      if (quantity === 0) {
        delete newCart[lotId];
      } else {
        newCart[lotId] = quantity;
      }
      return newCart;
    });
  };

  const handleValidateCart = async () => {
    if (!event) return;

    const items: CartItem[] = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([lotId, quantity]) => {
        const lot = lots.find((l) => l.id === lotId);
        return {
          ticketTypeId: lot!.ticket_type_id,
          lotId,
          quantity,
        };
      });

    if (items.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Selecione ao menos um ingresso',
        variant: 'destructive',
      });
      return;
    }

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF inválido',
        description: 'Por favor, informe um CPF válido',
        variant: 'destructive',
      });
      return;
    }

    try {
      setValidating(true);
      const result = await cartService.validateCart({
        tenantId: event.tenant_id,
        eventId: event.id,
        buyerCpf: cpf.replace(/\D/g, ''),
        items,
        couponCodes: couponCode ? [couponCode.toUpperCase()] : undefined,
      });

      if (result.ok) {
        const summary = result.summary!;
        let description = `${summary.totalItems} ingressos`;
        
        if (summary.pricing) {
          description += `\nSubtotal: ${formatBRL(summary.pricing.subtotal)}`;
          if (summary.pricing.discounts.length > 0) {
            const totalDiscount = summary.pricing.discounts.reduce((sum, d) => sum + d.amount, 0);
            description += `\nDesconto: ${formatBRL(totalDiscount)}`;
          }
          description += `\nTotal: ${formatBRL(summary.pricing.total)}`;
        }
        
        toast({
          title: 'Carrinho validado!',
          description,
        });
        
        if (summary.warnings.length > 0) {
          summary.warnings.forEach((warning) => {
            toast({
              title: 'Atenção',
              description: warning,
            });
          });
        }
      } else {
        result.errors!.forEach((error) => {
          toast({
            title: 'Erro de validação',
            description: error.message,
            variant: 'destructive',
          });
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o carrinho',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const isLotAvailable = (lot: Lot) => {
    const now = new Date();
    if (lot.inicio_vendas && new Date(lot.inicio_vendas) > now) return false;
    if (lot.fim_vendas && new Date(lot.fim_vendas) < now) return false;
    return lot.qtd_vendida < lot.qtd_total;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.titulo,
          text: event?.descricao || '',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado!',
        description: 'O link do evento foi copiado para a área de transferência',
      });
    }
  };

  const updateQuantity = (lotId: string, delta: number) => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return;
    
    const remaining = lot.qtd_total - lot.qtd_vendida;
    const currentQty = cart[lotId] || 0;
    const newQty = Math.max(0, Math.min(currentQty + delta, remaining));
    
    handleQuantityChange(lotId, String(newQty));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando evento...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Evento não encontrado</p>
      </div>
    );
  }

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalValue = Object.entries(cart).reduce((sum, [lotId, qty]) => {
    const lot = lots.find((l) => l.id === lotId);
    return sum + (lot ? lot.preco * qty : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/20 via-background to-accent/20 border-b">
        {event.imagem_url && (
          <div className="absolute inset-0 opacity-20">
            <img src={event.imagem_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="relative container mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para eventos
            </Link>
          </Button>
          
          <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
            {/* Informações principais */}
            <div>
              <h1 className="mb-4 text-4xl font-black text-foreground lg:text-5xl">
                {event.titulo}
              </h1>
              
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">{formatDate(event.inicio)}</span>
                  {event.fim && (
                    <>
                      <span className="text-muted-foreground">até</span>
                      <span className="font-medium">{formatDate(event.fim)}</span>
                    </>
                  )}
                </div>
                
                {event.local && (
                  <div className="flex items-start gap-2 text-lg">
                    <MapPin className="mt-1 h-5 w-5 text-primary" />
                    <span>{event.local}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    <CreditCard className="mr-1 h-3 w-3" />
                    Parcele em até 12x
                  </Badge>
                </div>
              </div>

              <Button onClick={handleShare} variant="outline" size="lg">
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>

            {/* Card com imagem do evento */}
            {event.imagem_url && (
              <div className="hidden lg:block">
                <img 
                  src={event.imagem_url} 
                  alt={event.titulo}
                  className="w-full rounded-lg shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          {/* Conteúdo principal */}
          <div className="space-y-8">
            {/* Descrição do evento */}
            {event.descricao && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição do evento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                    {event.descricao}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Ingressos */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-center text-2xl font-bold mb-6">Ingresso</h2>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {lots.map((lot) => {
                    const available = isLotAvailable(lot);
                    const remaining = lot.qtd_total - lot.qtd_vendida;
                    const quantity = cart[lot.id] || 0;
                    const ticketType = ticketTypes.find(tt => tt.id === lot.ticket_type_id);
                    const sector = sectors.find(s => s.id === ticketType?.sector_id);

                    return (
                      <Card key={lot.id} className={`${!available ? 'opacity-50' : ''}`}>
                        <CardContent className="p-5">
                          <div className="space-y-3">
                            {/* Nome do ingresso */}
                            <h3 className="font-bold text-foreground">
                              {lot.ticket_type_name} - {lot.nome}
                            </h3>
                            
                            {/* Preço */}
                            <div className="text-foreground/80">
                              <span className="text-base">
                                R$ {lot.preco.toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {' '}(+ R$ {(lot.preco * 0.1).toFixed(2).replace('.', ',')} taxa)
                              </span>
                            </div>
                            
                            {/* Parcelamento */}
                            <p className="text-sm font-semibold text-green-600">
                              Pague em até 12x
                            </p>
                            
                            {/* Ver Detalhes */}
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                              Ver Detalhes
                            </button>
                            
                            {/* Controles de quantidade */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => updateQuantity(lot.id, -1)}
                                disabled={!available || quantity === 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="min-w-[2rem] text-center font-semibold">
                                {quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => updateQuantity(lot.id, 1)}
                                disabled={!available || quantity >= remaining}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar com resumo - sticky */}
          <div className="lg:sticky lg:top-4 lg:h-fit">
            <Card className="border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CPF */}
                <div>
                  <Label htmlFor="cpf" className="text-sm font-semibold">
                    CPF do comprador *
                  </Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="mt-1.5"
                  />
                </div>

                {/* Cupom */}
                <div>
                  <Label htmlFor="coupon" className="text-sm font-semibold">
                    Cupom de desconto
                  </Label>
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite o código"
                    className="mt-1.5 uppercase"
                  />
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ingressos</span>
                    <span className="font-semibold">{totalItems}</span>
                  </div>
                  
                  {totalItems > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono">{formatBRL(totalValue)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span className="font-bold">Total</span>
                        <span className="font-mono font-bold text-primary">
                          {formatBRL(totalValue)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={handleValidateCart}
                  disabled={validating || totalItems === 0}
                  size="lg"
                >
                  {validating ? 'Validando...' : 'Comprar Ingressos'}
                </Button>

                {totalItems === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Selecione os ingressos acima
                  </p>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  Pagamento 100% seguro
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPublic;
