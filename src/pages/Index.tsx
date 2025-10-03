import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Event } from "@/services/events";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils/date";
import { useToast } from "@/hooks/use-toast";

/**
 * Landing page - Lista de eventos públicos filtrados por região e data
 */
const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRegion, setUserRegion] = useState<string>("Brasil");
  const { toast } = useToast();

  useEffect(() => {
    loadPublicEvents();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Em produção, você pode usar uma API de geocoding reverso
          // Por enquanto, mantemos como Brasil
          setUserRegion("Brasil");
        },
        (error) => {
          console.log("Localização não disponível:", error);
          setUserRegion("Brasil");
        }
      );
    }
  };

  const loadPublicEvents = async () => {
    try {
      setLoading(true);
      
      // Busca eventos públicos (status = publicado)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'publicado')
        .gte('inicio', new Date().toISOString())
        .order('inicio', { ascending: true })
        .limit(12);

      if (error) throw error;
      
      setEvents((data as Event[]) || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar a lista de eventos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Descubra Eventos Incríveis
            </h1>
            <p className="mb-6 text-xl text-muted-foreground">
              Encontre os melhores eventos em {userRegion}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard">Organizar Evento</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Entrar</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Próximos Eventos
          </h2>
          <p className="text-muted-foreground">
            {loading ? "Carregando..." : `${events.length} eventos encontrados`}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">Nenhum evento disponível</h3>
              <p className="mb-6 text-center text-muted-foreground">
                No momento não há eventos publicados em sua região.
              </p>
              <Button asChild>
                <Link to="/dashboard">Criar Primeiro Evento</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} to={`/e/${event.id}`}>
                <Card className="transition-all hover:shadow-lg hover:scale-[1.02]">
                  {event.imagem_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={event.imagem_url}
                        alt={event.titulo}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2">{event.titulo}</CardTitle>
                      <Badge variant="secondary">Publicado</Badge>
                    </div>
                    {event.descricao && (
                      <CardDescription className="line-clamp-2">
                        {event.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.inicio)}</span>
                      </div>
                      {event.local && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">{event.local}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{event.capacidade_total.toLocaleString('pt-BR')} lugares</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8 text-center">
          <h3 className="mb-2 text-lg font-semibold">Organize seu próprio evento</h3>
          <p className="mb-4 text-muted-foreground">
            Plataforma completa para gestão e venda de ingressos
          </p>
          <Button asChild>
            <Link to="/dashboard">Começar Agora</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
