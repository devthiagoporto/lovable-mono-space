import { supabase } from '@/integrations/supabase/client';

export interface Lot {
  id: string;
  tenant_id: string;
  ticket_type_id: string;
  nome: string;
  preco: number;
  qtd_total: number;
  qtd_vendida: number;
  inicio_vendas?: string;
  fim_vendas?: string;
}

export const lotService = {
  async list(ticketTypeId: string) {
    const { data, error } = await supabase
      .from('lots')
      .select('*')
      .eq('ticket_type_id', ticketTypeId)
      .order('inicio_vendas', { ascending: true });

    if (error) throw error;
    return data as Lot[];
  },

  async listByEvent(eventId: string) {
    const { data, error } = await supabase
      .from('lots')
      .select('*, ticket_types!inner(event_id)')
      .eq('ticket_types.event_id', eventId);

    if (error) throw error;
    return data as Lot[];
  },

  async getById(lotId: string) {
    const { data, error } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    if (error) throw error;
    return data as Lot;
  },

  async create(lot: Omit<Lot, 'id' | 'qtd_vendida'>) {
    const { data, error } = await supabase
      .from('lots')
      .insert({ ...lot, qtd_vendida: 0 })
      .select()
      .single();

    if (error) throw error;
    return data as Lot;
  },

  async update(lotId: string, updates: Partial<Lot>) {
    const { data, error } = await supabase
      .from('lots')
      .update(updates)
      .eq('id', lotId)
      .select()
      .single();

    if (error) throw error;
    return data as Lot;
  },

  async delete(lotId: string) {
    const { error } = await supabase
      .from('lots')
      .delete()
      .eq('id', lotId);

    if (error) throw error;
  },
};
