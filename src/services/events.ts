import { supabase } from '@/integrations/supabase/client';

export interface Event {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao?: string;
  local?: string;
  inicio: string;
  fim: string;
  status: string;
  capacidade_total: number;
  regras_limite?: {
    maxTotalPorPedido?: number;
    maxPorCPFPorTipo?: number;
    maxPorCPFNoEvento?: number;
  };
  imagem_url?: string;
  created_at?: string;
}

export const eventService = {
  async list(tenantId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Event[];
  },

  async getById(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data as Event;
  },

  async getPublicEvent(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('status', 'publicado')
      .single();

    if (error) throw error;
    return data as Event;
  },

  async create(event: Omit<Event, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  async update(eventId: string, updates: Partial<Event>) {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  async delete(eventId: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  },
};
