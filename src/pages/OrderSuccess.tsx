import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState(0);

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;

    try {
      // Load order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, events(titulo)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Count tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id')
        .eq('order_id', orderId);

      if (ticketsError) throw ticketsError;
      setTicketCount(tickets?.length || 0);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Pedido não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6 text-center">
            <p className="mb-2 text-sm text-muted-foreground">Pedido</p>
            <p className="mb-4 font-mono text-lg font-semibold">{orderId}</p>
            
            <p className="mb-2 text-sm text-muted-foreground">Evento</p>
            <p className="mb-4 text-xl font-bold">{order.events?.titulo}</p>

            <p className="mb-2 text-sm text-muted-foreground">Status</p>
            <p className="mb-4">
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {order.status === 'pago' ? 'Pago' : order.status}
              </span>
            </p>

            <p className="mb-2 text-sm text-muted-foreground">Ingressos Emitidos</p>
            <p className="text-3xl font-bold text-primary">{ticketCount}</p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => navigate(`/orders/${orderId}`)} 
              className="w-full"
              size="lg"
            >
              Ver Detalhes do Pedido
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Você receberá um e-mail de confirmação em breve com todos os detalhes do seu pedido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
