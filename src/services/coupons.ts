import { supabase } from '@/integrations/supabase/client';

export interface Coupon {
  id: string;
  tenant_id: string;
  event_id: string;
  codigo: string;
  tipo: 'percentual' | 'valor' | 'cortesia';
  valor: number;
  combinavel: boolean;
  limites?: {
    limiteTotal?: number;
    limitePorCPF?: number;
    whitelistTipos?: string[];
  };
  ativo: boolean;
  uso_total: number;
}

export interface CouponUsage {
  id: string;
  tenant_id: string;
  coupon_id: string;
  order_id: string;
  user_id?: string;
  cpf?: string;
  created_at: string;
}

export interface CouponAnalytics {
  totalAtivos: number;
  totalUsos: number;
  topCupons: Array<{
    codigo: string;
    tipo: string;
    uso_total: number;
  }>;
  usosPorDia: Array<{
    data: string;
    usos: number;
  }>;
}

export const couponService = {
  async list(eventId: string) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Coupon[];
  },

  async getById(couponId: string) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async create(coupon: Omit<Coupon, 'id' | 'uso_total'>) {
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        ...coupon,
        codigo: coupon.codigo.toUpperCase(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async update(couponId: string, updates: Partial<Coupon>) {
    if (updates.codigo) {
      updates.codigo = updates.codigo.toUpperCase();
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', couponId)
      .select()
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async delete(couponId: string) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) throw error;
  },

  async getUsage(couponId: string, page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('coupon_usage')
      .select('*', { count: 'exact' })
      .eq('coupon_id', couponId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data as CouponUsage[], count: count || 0 };
  },

  async getAnalytics(eventId: string): Promise<CouponAnalytics> {
    // Get all coupons for the event
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .eq('event_id', eventId);

    if (couponsError) throw couponsError;

    const totalAtivos = coupons?.filter(c => c.ativo).length || 0;
    const totalUsos = coupons?.reduce((sum, c) => sum + (c.uso_total || 0), 0) || 0;

    // Top 5 coupons by usage
    const topCupons = (coupons || [])
      .sort((a, b) => (b.uso_total || 0) - (a.uso_total || 0))
      .slice(0, 5)
      .map(c => ({
        codigo: c.codigo,
        tipo: c.tipo,
        uso_total: c.uso_total || 0,
      }));

    // Get usage by day for the last 30 days
    const { data: usageData, error: usageError } = await supabase
      .from('coupon_usage')
      .select('created_at')
      .in('coupon_id', (coupons || []).map(c => c.id))
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (usageError) throw usageError;

    // Group by day
    const usageByDay = new Map<string, number>();
    (usageData || []).forEach(u => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      usageByDay.set(date, (usageByDay.get(date) || 0) + 1);
    });

    const usosPorDia = Array.from(usageByDay.entries())
      .map(([data, usos]) => ({ data, usos }))
      .sort((a, b) => a.data.localeCompare(b.data));

    return {
      totalAtivos,
      totalUsos,
      topCupons,
      usosPorDia,
    };
  },

  async exportUsageCSV(eventId: string): Promise<string> {
    // Get all coupons for the event
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('id, codigo')
      .eq('event_id', eventId);

    if (couponsError) throw couponsError;

    if (!coupons || coupons.length === 0) {
      return 'codigo,cpf,data\n';
    }

    // Get all usage
    const { data: usage, error: usageError } = await supabase
      .from('coupon_usage')
      .select('coupon_id, cpf, created_at')
      .in('coupon_id', coupons.map(c => c.id))
      .order('created_at', { ascending: false });

    if (usageError) throw usageError;

    // Create CSV
    const couponMap = new Map(coupons.map(c => [c.id, c.codigo]));
    const rows = ['codigo,cpf,data'];
    
    (usage || []).forEach(u => {
      const codigo = couponMap.get(u.coupon_id) || 'UNKNOWN';
      const cpf = u.cpf || 'N/A';
      const data = new Date(u.created_at).toLocaleString('pt-BR');
      rows.push(`${codigo},${cpf},${data}`);
    });

    return rows.join('\n');
  },
};
