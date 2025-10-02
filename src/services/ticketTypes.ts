import { supabase } from '@/integrations/supabase/client';

export interface TicketType {
  id: string;
  tenant_id: string;
  event_id: string;
  sector_id: string;
  nome: string;
  preco: number;
  taxa: number;
  max_por_pedido?: number;
  meia_elegivel: boolean;
  ativo: boolean;
}

export const ticketTypeService = {
  async list(eventId: string) {
    const { data, error } = await supabase
      .from('ticket_types')
      .select('*, sectors(nome)')
      .eq('event_id', eventId)
      .order('sector_id');

    if (error) throw error;
    return data as (TicketType & { sectors: { nome: string } })[];
  },

  async getById(ticketTypeId: string) {
    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', ticketTypeId)
      .single();

    if (error) throw error;
    return data as TicketType;
  },

  async create(ticketType: Omit<TicketType, 'id'>) {
    const { data, error } = await supabase
      .from('ticket_types')
      .insert(ticketType)
      .select()
      .single();

    if (error) throw error;
    return data as TicketType;
  },

  async update(ticketTypeId: string, updates: Partial<TicketType>) {
    const { data, error } = await supabase
      .from('ticket_types')
      .update(updates)
      .eq('id', ticketTypeId)
      .select()
      .single();

    if (error) throw error;
    return data as TicketType;
  },

  async delete(ticketTypeId: string) {
    const { error } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', ticketTypeId);

    if (error) throw error;
  },
};
