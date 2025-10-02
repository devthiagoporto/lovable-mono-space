import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { couponService } from '@/services/coupons';
import { ticketTypeService } from '@/services/ticketTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function CouponForm() {
  const { eventId, couponId } = useParams<{ eventId: string; couponId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    codigo: '',
    tipo: 'percentual' as 'percentual' | 'valor' | 'cortesia',
    valor: 0,
    combinavel: false,
    ativo: true,
    limiteTotal: '',
    limitePorCPF: '',
    whitelistTipos: [] as string[],
  });

  useEffect(() => {
    if (eventId) {
      loadTicketTypes();
      if (couponId) {
        loadCoupon();
      }
    }
  }, [eventId, couponId]);

  const loadTicketTypes = async () => {
    try {
      const data = await ticketTypeService.list(eventId!);
      setTicketTypes(data);
    } catch (error) {
      console.error('Error loading ticket types:', error);
    }
  };

  const loadCoupon = async () => {
    try {
      setLoading(true);
      const data = await couponService.getById(couponId!);
      setFormData({
        codigo: data.codigo,
        tipo: data.tipo,
        valor: data.valor,
        combinavel: data.combinavel,
        ativo: data.ativo,
        limiteTotal: data.limites?.limiteTotal?.toString() || '',
        limitePorCPF: data.limites?.limitePorCPF?.toString() || '',
        whitelistTipos: data.limites?.whitelistTipos || [],
      });
    } catch (error) {
      console.error('Error loading coupon:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o cupom.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.codigo.trim()) {
      toast({
        title: 'Erro',
        description: 'O código do cupom é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.tipo !== 'cortesia' && formData.valor < 0) {
      toast({
        title: 'Erro',
        description: 'O valor deve ser maior ou igual a zero.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.tipo === 'percentual' && formData.valor > 100) {
      toast({
        title: 'Erro',
        description: 'O percentual não pode ser maior que 100%.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const limites: any = {};
      if (formData.limiteTotal) limites.limiteTotal = parseInt(formData.limiteTotal);
      if (formData.limitePorCPF) limites.limitePorCPF = parseInt(formData.limitePorCPF);
      if (formData.whitelistTipos.length > 0) limites.whitelistTipos = formData.whitelistTipos;

      const couponData = {
        tenant_id: '', // Will be set by RLS/backend
        event_id: eventId!,
        codigo: formData.codigo.toUpperCase(),
        tipo: formData.tipo,
        valor: formData.tipo === 'cortesia' ? 100 : formData.valor,
        combinavel: formData.combinavel,
        ativo: formData.ativo,
        limites: Object.keys(limites).length > 0 ? limites : undefined,
      };

      if (couponId) {
        await couponService.update(couponId, couponData);
        toast({
          title: 'Sucesso',
          description: 'Cupom atualizado com sucesso.',
        });
      } else {
        await couponService.create(couponData as any);
        toast({
          title: 'Sucesso',
          description: 'Cupom criado com sucesso.',
        });
      }

      navigate(`/dashboard/events/${eventId}/coupons`);
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Erro',
          description: 'Já existe um cupom com este código neste evento.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o cupom.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelistToggle = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      whitelistTipos: prev.whitelistTipos.includes(typeId)
        ? prev.whitelistTipos.filter(id => id !== typeId)
        : [...prev.whitelistTipos, typeId],
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/events/${eventId}/coupons`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{couponId ? 'Editar Cupom' : 'Novo Cupom'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: VERAO2025"
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Desconto *</Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="percentual">Percentual (%)</option>
                <option value="valor">Valor Fixo (R$)</option>
                <option value="cortesia">Cortesia (Gratuito)</option>
              </select>
            </div>

            {formData.tipo !== 'cortesia' && (
              <div className="space-y-2">
                <Label htmlFor="valor">
                  Valor {formData.tipo === 'percentual' ? '(%)' : '(R$)'} *
                </Label>
                <Input
                  id="valor"
                  type="number"
                  min="0"
                  max={formData.tipo === 'percentual' ? 100 : undefined}
                  step={formData.tipo === 'percentual' ? 1 : 0.01}
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="combinavel"
                checked={formData.combinavel}
                onCheckedChange={(checked) => setFormData({ ...formData, combinavel: checked })}
              />
              <Label htmlFor="combinavel">Cupom combinável com outros</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Cupom ativo</Label>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Limites (Opcional)</h3>

              <div className="space-y-2">
                <Label htmlFor="limiteTotal">Limite Total de Usos</Label>
                <Input
                  id="limiteTotal"
                  type="number"
                  min="0"
                  value={formData.limiteTotal}
                  onChange={(e) => setFormData({ ...formData, limiteTotal: e.target.value })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitePorCPF">Limite por CPF</Label>
                <Input
                  id="limitePorCPF"
                  type="number"
                  min="0"
                  value={formData.limitePorCPF}
                  onChange={(e) => setFormData({ ...formData, limitePorCPF: e.target.value })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              {ticketTypes.length > 0 && (
                <div className="space-y-2">
                  <Label>Aplicar apenas aos tipos (whitelist)</Label>
                  <p className="text-sm text-muted-foreground">
                    Deixe vazio para aplicar a todos os tipos
                  </p>
                  <div className="space-y-2 mt-2">
                    {ticketTypes.map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`type-${type.id}`}
                          checked={formData.whitelistTipos.includes(type.id)}
                          onChange={() => handleWhitelistToggle(type.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`type-${type.id}`} className="font-normal">
                          {type.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Salvando...' : couponId ? 'Atualizar Cupom' : 'Criar Cupom'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/events/${eventId}/coupons`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
