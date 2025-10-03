import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Search, Music, Theater, Mic2, Ticket, Trophy, Briefcase } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = [
    { id: "show", label: "Festas e Shows", icon: Music },
    { id: "teatro", label: "Teatro", icon: Theater },
    { id: "comedy", label: "Stand Up", icon: Mic2 },
    { id: "esporte", label: "Esportes", icon: Trophy },
    { id: "congresso", label: "Congressos", icon: Briefcase },
  ];

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

  const filteredEvents = events.filter((event) => {
    const matchesSearch = searchQuery === "" || 
      event.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.local?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header com busca */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Ticket className="h-8 w-8 text-primary" />
              <span className="text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Eventos
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Criar evento</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero com busca centralizada */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              Encontre seu próximo evento
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Shows, festas, congressos e muito mais em {userRegion}
            </p>
            
            {/* Barra de busca estilo Sympla */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar eventos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 text-lg border-2 focus:border-primary shadow-lg"
              />
            </div>

            {/* Filtros de categoria */}
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-primary" : ""}
              >
                Todos
              </Button>
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={selectedCategory === cat.id ? "bg-primary" : ""}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Próximos Eventos
          </h2>
          <p className="text-muted-foreground">
            {loading ? "Carregando..." : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}`}
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
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">Nenhum evento encontrado</h3>
              <p className="mb-6 text-center text-muted-foreground">
                Tente ajustar sua busca ou limpar os filtros
              </p>
              <Button onClick={() => setSearchQuery("")}>Limpar Busca</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEvents.map((event) => (
              <Link key={event.id} to={`/e/${event.id}`} className="group block">
                <Card className="h-full transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden border-0 shadow-md">
                  {event.imagem_url ? (
                    <div className="aspect-[16/9] w-full overflow-hidden relative">
                      <img
                        src={event.imagem_url}
                        alt={event.titulo}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                      <Calendar className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <CardHeader className="space-y-2 pb-3">
                    <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors leading-snug">
                      {event.titulo}
                    </CardTitle>
                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(event.inicio)}</span>
                      </div>
                      {event.local && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="line-clamp-1">{event.local}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-20 border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16 text-center">
          <h3 className="mb-3 text-3xl font-bold text-foreground">
            Organize seu próprio evento
          </h3>
          <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para criar, gerenciar e vender ingressos online. Comece grátis em poucos minutos.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 h-12">
            <Link to="/dashboard">Criar Evento Grátis</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
