import { supabase } from '@/integrations/supabase/client';

export interface CreateOperatorRequest {
  email: string;
  nome: string;
  tenantId: string;
}

export interface CreateOperatorResponse {
  userId: string;
  tempPassword: string;
}

export interface AssignRoleRequest {
  userId: string;
  tenantId: string;
  role: 'organizer_staff' | 'checkin_operator' | 'buyer';
}

export const adminService = {
  async createOperator(
    request: CreateOperatorRequest
  ): Promise<CreateOperatorResponse> {
    const { data, error } = await supabase.functions.invoke('operators-create', {
      body: request,
    });

    if (error) throw error;
    return data;
  },

  async assignRole(request: AssignRoleRequest): Promise<void> {
    const { error } = await supabase.functions.invoke('roles-assign', {
      body: request,
    });

    if (error) throw error;
  },
};
