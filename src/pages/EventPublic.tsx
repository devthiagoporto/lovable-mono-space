import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventService, Event } from '@/services/events';
import { sectorService, Sector } from '@/services/sectors';
import { ticketTypeService, TicketType } from '@/services/ticketTypes';
import { lotService, Lot } from '@/services/lots';
import { cartService, CartItem } from '@/services/cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils/date';
import { formatBRL } from '@/lib/utils/currency';
import { formatCPF } from '@/lib/utils/cpf';

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
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{event.titulo}</CardTitle>
            <CardDescription>{event.descricao}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Local:</strong> {event.local}</p>
              <p><strong>Início:</strong> {formatDate(event.inicio)}</p>
              <p><strong>Fim:</strong> {formatDate(event.fim)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <Label htmlFor="coupon">Cupom de Desconto (opcional)</Label>
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

        <div className="mb-6 space-y-4">
          {sectors.map((sector) => {
            const sectorLots = lots.filter((l) => l.sector_name === sector.nome);
            if (sectorLots.length === 0) return null;

            return (
              <Card key={sector.id}>
                <CardHeader>
                  <CardTitle>{sector.nome}</CardTitle>
                  <CardDescription>Capacidade: {sector.capacidade}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectorLots.map((lot) => {
                      const available = isLotAvailable(lot);
                      const remaining = lot.qtd_total - lot.qtd_vendida;

                      return (
                        <div key={lot.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                          <div className="flex-1">
                            <h4 className="font-semibold">{lot.ticket_type_name} - {lot.nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatBRL(lot.preco)} • Disponíveis: {remaining}/{lot.qtd_total}
                            </p>
                            {!available && (
                              <p className="text-sm text-destructive">Indisponível</p>
                            )}
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              value={cart[lot.id] || 0}
                              onChange={(e) => handleQuantityChange(lot.id, e.target.value)}
                              disabled={!available}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total de ingressos:</span>
                <span className="font-semibold">{totalItems}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Valor total:</span>
                <span className="font-bold">{formatBRL(totalValue)}</span>
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={handleValidateCart}
              disabled={validating || totalItems === 0}
            >
              {validating ? 'Validando...' : 'Continuar'}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Próxima etapa: pagamento (não implementado ainda)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventPublic;
