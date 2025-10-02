import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { couponService, type CouponAnalytics } from '@/services/coupons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, TrendingUp, Tag, Users } from 'lucide-react';

export default function CouponAnalyticsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadAnalytics();
    }
  }, [eventId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await couponService.getAnalytics(eventId!);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as análises.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando análises...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Nenhum dado disponível.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/events/${eventId}/coupons`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Analytics de Cupons</h1>
        <p className="text-muted-foreground">Visualize o desempenho dos cupons do evento</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupons Ativos</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAtivos}</div>
            <p className="text-xs text-muted-foreground">
              Cupons disponíveis para uso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsos}</div>
            <p className="text-xs text-muted-foreground">
              Usos acumulados de todos os cupons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Cupom</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalAtivos > 0
                ? (analytics.totalUsos / analytics.totalAtivos).toFixed(1)
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Usos médios por cupom ativo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Cupons por Uso</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topCupons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum cupom foi utilizado ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.topCupons.map((cupom, index) => (
                <div
                  key={cupom.codigo}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{cupom.codigo}</p>
                      <p className="text-sm text-muted-foreground">{cupom.tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{cupom.uso_total}</p>
                    <p className="text-sm text-muted-foreground">usos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usos por Dia (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.usosPorDia.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum uso registrado nos últimos 30 dias.
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.usosPorDia.map((dia) => (
                <div
                  key={dia.data}
                  className="flex items-center justify-between p-3 border-b last:border-b-0"
                >
                  <span className="text-sm">
                    {new Date(dia.data).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{
                        width: `${Math.min((dia.usos / Math.max(...analytics.usosPorDia.map(d => d.usos))) * 200, 200)}px`,
                      }}
                    />
                    <span className="font-semibold w-12 text-right">{dia.usos}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
