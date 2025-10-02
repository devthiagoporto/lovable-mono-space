import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { eventService, Event } from '@/services/events';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const EventForm = () => {
  const { eventId } = useParams();
  const { memberships } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isEditing = eventId !== 'new';

  const tenantId = memberships[0]?.tenantId;

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    local: '',
    inicio: '',
    fim: '',
    status: 'rascunho',
    capacidade_total: 0,
    maxTotalPorPedido: '',
    maxPorCPFPorTipo: '',
    maxPorCPFNoEvento: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && eventId) {
      loadEvent();
    }
  }, [eventId, isEditing]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const event = await eventService.getById(eventId!);
      setFormData({
        titulo: event.titulo,
        descricao: event.descricao || '',
        local: event.local || '',
        inicio: event.inicio.substring(0, 16),
        fim: event.fim.substring(0, 16),
        status: event.status,
        capacidade_total: event.capacidade_total,
        maxTotalPorPedido: event.regras_limite?.maxTotalPorPedido?.toString() || '',
        maxPorCPFPorTipo: event.regras_limite?.maxPorCPFPorTipo?.toString() || '',
        maxPorCPFNoEvento: event.regras_limite?.maxPorCPFNoEvento?.toString() || '',
      });
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o evento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(formData.inicio) >= new Date(formData.fim)) {
      toast({
        title: 'Erro de validação',
        description: 'A data de início deve ser anterior à data de fim',
        variant: 'destructive',
      });
      return;
    }

    if (formData.capacidade_total < 1) {
      toast({
        title: 'Erro de validação',
        description: 'Capacidade total deve ser maior que zero',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const eventData: Omit<Event, 'id' | 'created_at'> = {
        tenant_id: tenantId,
        titulo: formData.titulo,
        descricao: formData.descricao || undefined,
        local: formData.local || undefined,
        inicio: new Date(formData.inicio).toISOString(),
        fim: new Date(formData.fim).toISOString(),
        status: formData.status,
        capacidade_total: formData.capacidade_total,
        regras_limite: {
          ...(formData.maxTotalPorPedido && { maxTotalPorPedido: parseInt(formData.maxTotalPorPedido) }),
          ...(formData.maxPorCPFPorTipo && { maxPorCPFPorTipo: parseInt(formData.maxPorCPFPorTipo) }),
          ...(formData.maxPorCPFNoEvento && { maxPorCPFNoEvento: parseInt(formData.maxPorCPFNoEvento) }),
        },
      };

      if (isEditing) {
        await eventService.update(eventId!, eventData);
        toast({
          title: 'Sucesso',
          description: 'Evento atualizado com sucesso',
        });
      } else {
        const newEvent = await eventService.create(eventData);
        toast({
          title: 'Sucesso',
          description: 'Evento criado com sucesso',
        });
        navigate(`/dashboard/events/${newEvent.id}`);
        return;
      }

      navigate('/dashboard/events');
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o evento',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? 'Editar Evento' : 'Criar Evento'}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Evento</CardTitle>
              <CardDescription>Preencha os dados básicos do evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="inicio">Data/Hora de Início *</Label>
                  <Input
                    id="inicio"
                    type="datetime-local"
                    value={formData.inicio}
                    onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="fim">Data/Hora de Fim *</Label>
                  <Input
                    id="fim"
                    type="datetime-local"
                    value={formData.fim}
                    onChange={(e) => setFormData({ ...formData, fim: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="capacidade_total">Capacidade Total *</Label>
                  <Input
                    id="capacidade_total"
                    type="number"
                    min="1"
                    value={formData.capacidade_total}
                    onChange={(e) => setFormData({ ...formData, capacidade_total: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Regras e Limites</CardTitle>
              <CardDescription>Configure limites de compra (opcional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maxTotalPorPedido">Máximo Total por Pedido</Label>
                <Input
                  id="maxTotalPorPedido"
                  type="number"
                  min="1"
                  value={formData.maxTotalPorPedido}
                  onChange={(e) => setFormData({ ...formData, maxTotalPorPedido: e.target.value })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              <div>
                <Label htmlFor="maxPorCPFPorTipo">Máximo por CPF por Tipo</Label>
                <Input
                  id="maxPorCPFPorTipo"
                  type="number"
                  min="1"
                  value={formData.maxPorCPFPorTipo}
                  onChange={(e) => setFormData({ ...formData, maxPorCPFPorTipo: e.target.value })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              <div>
                <Label htmlFor="maxPorCPFNoEvento">Máximo por CPF no Evento</Label>
                <Input
                  id="maxPorCPFNoEvento"
                  type="number"
                  min="1"
                  value={formData.maxPorCPFNoEvento}
                  onChange={(e) => setFormData({ ...formData, maxPorCPFNoEvento: e.target.value })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/events')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
