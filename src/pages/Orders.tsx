import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { orderService, Order } from '@/services/orders';
import { ticketService, Ticket } from '@/services/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatBRL } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { Link } from 'react-router-dom';
import { ArrowLeft, Ticket as TicketIcon } from 'lucide-react';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userOrders = await orderService.listByBuyer(user.id);
      setOrders(userOrders);

      // Carregar tickets para cada order
      const ticketsMap: Record<string, Ticket[]> = {};
      for (const order of userOrders) {
        const orderTickets = await ticketService.listByOrder(order.id);
        ticketsMap[order.id] = orderTickets;
      }
      setTickets(ticketsMap);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      rascunho: 'secondary',
      pendente: 'default',
      confirmado: 'default',
      cancelado: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8">
      <div className="container mx-auto px-4">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-6">Meus Pedidos</h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Você ainda não fez nenhum pedido</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Pedido #{order.id.slice(0, 8)}
                    </CardTitle>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(new Date(order.created_at))}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-lg font-mono">
                        {formatBRL(Number(order.total))}
                      </span>
                    </div>

                    {tickets[order.id] && tickets[order.id].length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <TicketIcon className="h-4 w-4" />
                            Ingressos ({tickets[order.id].length})
                          </h4>
                          <div className="space-y-2">
                            {tickets[order.id].map((ticket) => (
                              <Link
                                key={ticket.id}
                                to={`/tickets/${ticket.id}`}
                                className="block"
                              >
                                <div className="p-3 rounded-lg border hover:bg-accent transition-colors">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{ticket.nome_titular}</p>
                                      <p className="text-xs text-muted-foreground">
                                        CPF: {ticket.cpf_titular}
                                      </p>
                                    </div>
                                    <Badge variant="secondary">{ticket.status}</Badge>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
