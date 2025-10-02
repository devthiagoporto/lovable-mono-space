import { supabase } from '@/integrations/supabase/client';

export interface UserMembership {
  tenantId: string;
  tenantName: string;
  role: string;
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
  };
  memberships: UserMembership[];
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async fetchMe(): Promise<MeResponse | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: roles, error } = await supabase
      .from('user_roles')
      .select(`
        tenant_id,
        role,
        tenants (
          nome
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    const memberships: UserMembership[] = (roles || []).map((item: any) => ({
      tenantId: item.tenant_id,
      tenantName: item.tenants?.nome || 'Unknown',
      role: item.role,
    }));

    return {
      user: {
        id: user.id,
        email: user.email || '',
      },
      memberships,
    };
  },
};
