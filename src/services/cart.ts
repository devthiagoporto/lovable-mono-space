import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  ticketTypeId: string;
  lotId: string;
  quantity: number;
}

export interface CartValidationRequest {
  tenantId: string;
  eventId: string;
  buyerCpf: string;
  items: CartItem[];
}

export interface ValidationError {
  code: string;
  message: string;
  ticketTypeId?: string;
  lotId?: string;
}

export interface CartValidationResponse {
  ok: boolean;
  summary?: {
    totalItems: number;
    byType: Array<{ ticketTypeId: string; qty: number }>;
    byLot: Array<{ lotId: string; qty: number }>;
    warnings: string[];
  };
  errors?: ValidationError[];
}

export const cartService = {
  async validateCart(request: CartValidationRequest): Promise<CartValidationResponse> {
    const { data, error } = await supabase.functions.invoke('cart-validate', {
      body: request,
    });

    if (error) {
      console.error('Cart validation error:', error);
      throw error;
    }

    return data as CartValidationResponse;
  },
};
