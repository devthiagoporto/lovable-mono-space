import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { eventService, Event } from '@/services/events';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils/date';

const Events = () => {
  const { memberships } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantId = memberships[0]?.tenantId;

  useEffect(() => {
    if (tenantId) {
      loadEvents();
    }
  }, [tenantId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.list(tenantId);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os eventos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      rascunho: 'secondary',
      publicado: 'default',
      cancelado: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando eventos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
            <p className="text-muted-foreground">Gerencie seus eventos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar
            </Button>
            <Button onClick={() => navigate('/dashboard/events/new')}>
              Criar Evento
            </Button>
          </div>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">Nenhum evento cadastrado</p>
              <Button onClick={() => navigate('/dashboard/events/new')}>
                Criar Primeiro Evento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate(`/dashboard/events/${event.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{event.titulo}</CardTitle>
                    {getStatusBadge(event.status)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {event.descricao || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      <strong>Local:</strong> {event.local || 'Não definido'}
                    </p>
                    <p className="text-muted-foreground">
                      <strong>Início:</strong> {formatDate(event.inicio)}
                    </p>
                    <p className="text-muted-foreground">
                      <strong>Capacidade:</strong> {event.capacidade_total}
                    </p>
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

export default Events;
