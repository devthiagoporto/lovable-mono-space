import { supabase } from '@/integrations/supabase/client';

export interface Order {
  id: string;
  tenant_id: string;
  event_id: string;
  buyer_id: string | null;
  status: string;
  total: number;
  payment_intent_id: string | null;
  payment_provider: string | null;
  created_at: string;
}

export interface OrderItem {
  ticketTypeId: string;
  lotId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  tenantId: string;
  eventId: string;
  buyerCpf: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  couponCodes?: string[];
}

export const orderService = {
  async create(request: CreateOrderRequest): Promise<Order> {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        tenant_id: request.tenantId,
        event_id: request.eventId,
        buyer_id: (await supabase.auth.getUser()).data.user?.id || null,
        status: 'aguardando_pagto' as const,
        total: request.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      }])
      .select()
      .single();

    if (error) throw error;
    return order;
  },

  async getById(orderId: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  async listByBuyer(buyerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async listByEvent(eventId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status: status as any })
      .eq('id', orderId);

    if (error) throw error;
  },

  async updatePaymentInfo(orderId: string, paymentIntentId: string, provider: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_intent_id: paymentIntentId,
        payment_provider: provider,
      })
      .eq('id', orderId);

    if (error) throw error;
  },
};
