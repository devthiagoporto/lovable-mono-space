import { supabase } from '@/integrations/supabase/client';

export async function getMyOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('orders')
    .select('id,total,status,created_at')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getMyTickets() {
  const { data, error } = await supabase.functions.invoke('my-tickets');
  if (error) throw error;
  return data.tickets ?? [];
}
