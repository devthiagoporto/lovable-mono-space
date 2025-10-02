import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { couponService, type Coupon } from '@/services/coupons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, BarChart3, Download } from 'lucide-react';

export default function Coupons() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');

  useEffect(() => {
    if (eventId) {
      loadCoupons();
    }
  }, [eventId]);

  useEffect(() => {
    applyFilters();
  }, [coupons, searchTerm, filterTipo, filterAtivo]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponService.list(eventId!);
      setCoupons(data);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os cupons.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...coupons];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterTipo !== 'all') {
      filtered = filtered.filter(c => c.tipo === filterTipo);
    }

    if (filterAtivo !== 'all') {
      const isAtivo = filterAtivo === 'true';
      filtered = filtered.filter(c => c.ativo === isAtivo);
    }

    setFilteredCoupons(filtered);
  };

  const handleToggleAtivo = async (coupon: Coupon) => {
    try {
      await couponService.update(coupon.id, { ativo: !coupon.ativo });
      toast({
        title: 'Sucesso',
        description: `Cupom ${coupon.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      });
      loadCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cupom.',
        variant: 'destructive',
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await couponService.exportUsageCSV(eventId!);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cupons-evento-${eventId}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Sucesso',
        description: 'CSV exportado com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar o CSV.',
        variant: 'destructive',
      });
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      percentual: 'Percentual',
      valor: 'Valor Fixo',
      cortesia: 'Cortesia',
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const getValorDisplay = (coupon: Coupon) => {
    if (coupon.tipo === 'percentual') {
      return `${coupon.valor}%`;
    } else if (coupon.tipo === 'valor') {
      return `R$ ${coupon.valor.toFixed(2)}`;
    } else {
      return 'Gratuito';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando cupons...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cupons de Desconto</h1>
          <p className="text-muted-foreground">Gerencie os cupons deste evento</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/events/${eventId}/coupons/analytics`)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button onClick={() => navigate(`/dashboard/events/${eventId}/coupons/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cupom
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Todos os tipos</option>
              <option value="percentual">Percentual</option>
              <option value="valor">Valor Fixo</option>
              <option value="cortesia">Cortesia</option>
            </select>
            <select
              value={filterAtivo}
              onChange={(e) => setFilterAtivo(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredCoupons.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center min-h-[200px]">
              <p className="text-muted-foreground">
                {coupons.length === 0
                  ? 'Nenhum cupom cadastrado ainda.'
                  : 'Nenhum cupom encontrado com os filtros aplicados.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCoupons.map((coupon) => (
            <Card key={coupon.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{coupon.codigo}</h3>
                    <Badge variant={coupon.ativo ? 'default' : 'secondary'}>
                      {coupon.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">{getTipoLabel(coupon.tipo)}</Badge>
                    {coupon.combinavel && (
                      <Badge variant="outline">Combinável</Badge>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>Desconto: <strong>{getValorDisplay(coupon)}</strong></span>
                    <span>Usos: <strong>{coupon.uso_total}</strong></span>
                    {coupon.limites?.limiteTotal && (
                      <span>Limite: <strong>{coupon.limites.limiteTotal}</strong></span>
                    )}
                    {coupon.limites?.limitePorCPF && (
                      <span>Limite/CPF: <strong>{coupon.limites.limitePorCPF}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/events/${eventId}/coupons/${coupon.id}`)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant={coupon.ativo ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => handleToggleAtivo(coupon)}
                  >
                    {coupon.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
