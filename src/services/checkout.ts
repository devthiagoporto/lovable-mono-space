import { supabase } from '@/integrations/supabase/client';

export interface CheckoutItem {
  ticketTypeId: string;
  lotId: string;
  quantity: number;
}

export interface CreateCheckoutRequest {
  eventId: string;
  items: CheckoutItem[];
  successUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
}

export interface CreateCheckoutResponse {
  ok: boolean;
  checkoutUrl?: string;
  orderId?: string;
  message?: string;
}

export const checkoutService = {
  async create(
    tenantId: string,
    request: CreateCheckoutRequest
  ): Promise<CreateCheckoutResponse> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('checkout-create', {
      headers: {
        'x-tenant-id': tenantId,
      },
      body: request,
    });

    if (error) throw error;
    return data;
  },
};
