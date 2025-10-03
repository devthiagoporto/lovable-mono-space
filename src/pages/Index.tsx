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
      {/* Hero Section com gradiente vibrante */}
      <div className="relative overflow-hidden border-b">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <div className="mb-6 inline-block animate-pulse">
              <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-4 py-1.5 text-sm font-semibold">
                🎉 Eventos ao Vivo
              </Badge>
            </div>
            <h1 className="mb-6 text-5xl font-black tracking-tight text-foreground sm:text-7xl bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Viva a Festa!
            </h1>
            <p className="mb-4 text-2xl font-semibold text-foreground/90">
              Descubra eventos incríveis em {userRegion}
            </p>
            <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
              Ingressos para shows, festas, festivais e muito mais. Compre agora e garanta sua diversão!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8 py-6 shadow-lg shadow-primary/30">
                <Link to="/dashboard">🎤 Organizar Evento</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-2 border-primary/50 hover:border-primary hover:bg-primary/10 text-lg px-8 py-6">
                <Link to="/login">Entrar</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {/* Events List */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎊 Próximos Eventos
          </h2>
          <p className="text-lg text-muted-foreground">
            {loading ? "Carregando eventos incríveis..." : `${events.length} ${events.length === 1 ? 'evento disponível' : 'eventos disponíveis'}`}
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
              <Link key={event.id} to={`/e/${event.id}`} className="group">
                <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 border-2 hover:border-primary/50 overflow-hidden">
                  {event.imagem_url ? (
                    <div className="aspect-video w-full overflow-hidden relative">
                      <img
                        src={event.imagem_url}
                        alt={event.titulo}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                      <Calendar className="h-16 w-16 text-primary/50" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                        {event.titulo}
                      </CardTitle>
                      <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 shrink-0">
                        ✨ Aberto
                      </Badge>
                    </div>
                    {event.descricao && (
                      <CardDescription className="line-clamp-2">
                        {event.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{formatDate(event.inicio)}</span>
                      </div>
                      {event.local && (
                        <div className="flex items-center gap-2 text-foreground/80">
                          <MapPin className="h-4 w-4 text-accent" />
                          <span className="line-clamp-1">{event.local}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Users className="h-4 w-4 text-secondary" />
                        <span className="font-semibold">{event.capacidade_total.toLocaleString('pt-BR')} lugares</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity" asChild>
                      <span>Ver Ingressos 🎫</span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
        <div className="relative container mx-auto px-4 py-12 text-center">
          <h3 className="mb-3 text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Organize seu próprio evento 🎪
          </h3>
          <p className="mb-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Plataforma completa para gestão e venda de ingressos. Crie, gerencie e venda ingressos de forma simples.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 px-8 py-6 text-lg">
            <Link to="/dashboard">🚀 Começar Agora - É Grátis!</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
