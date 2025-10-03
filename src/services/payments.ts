import { supabase } from '@/integrations/supabase/client';

export type PaymentProvider = 'stripe' | 'pagarme' | 'mercadopago' | 'pix_manual';

export interface PaymentGateway {
  id: string;
  tenant_id: string;
  provider: PaymentProvider;
  active: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UpsertPaymentGatewayRequest {
  provider: PaymentProvider;
  active: boolean;
  config: Record<string, any>;
}

export const paymentService = {
  async list(tenantId: string): Promise<PaymentGateway[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('payments-list', {
      headers: {
        'x-tenant-id': tenantId,
      },
    });

    if (error) throw error;
    return data.gateways || [];
  },

  async upsert(
    tenantId: string,
    payload: UpsertPaymentGatewayRequest
  ): Promise<PaymentGateway> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('payments-upsert', {
      headers: {
        'x-tenant-id': tenantId,
      },
      body: payload,
    });

    if (error) throw error;
    return data.gateway;
  },
};
