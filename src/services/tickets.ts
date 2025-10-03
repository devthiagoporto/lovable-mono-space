import { supabase } from '@/integrations/supabase/client';

export interface Ticket {
  id: string;
  tenant_id: string;
  order_id: string;
  ticket_type_id: string;
  sector_id: string;
  nome_titular: string;
  cpf_titular: string;
  status: string;
  qr_nonce: string | null;
  qr_kid: string | null;
  qr_version: number;
  qr_last_issued_at: string | null;
}

export interface CreateTicketRequest {
  tenantId: string;
  orderId: string;
  ticketTypeId: string;
  sectorId: string;
  nomeTitular: string;
  cpfTitular: string;
}

export const ticketService = {
  async create(request: CreateTicketRequest): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        tenant_id: request.tenantId,
        order_id: request.orderId,
        ticket_type_id: request.ticketTypeId,
        sector_id: request.sectorId,
        nome_titular: request.nomeTitular,
        cpf_titular: request.cpfTitular,
        status: 'emitido',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getById(ticketId: string): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    return data;
  },

  async listByOrder(orderId: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async listByUser(userId: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        orders!inner(buyer_id)
      `)
      .eq('orders.buyer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateStatus(ticketId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .update({ status: status as any })
      .eq('id', ticketId);

    if (error) throw error;
  },

  async generateQRCode(ticketId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-qr', {
      body: { ticketId },
    });

    if (error) throw error;
    return data.qrCode;
  },
};
