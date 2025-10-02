import { supabase } from '@/integrations/supabase/client';

export interface Sector {
  id: string;
  tenant_id: string;
  event_id: string;
  nome: string;
  capacidade: number;
  ordem: number;
}

export const sectorService = {
  async list(eventId: string) {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .eq('event_id', eventId)
      .order('ordem', { ascending: true });

    if (error) throw error;
    return data as Sector[];
  },

  async getById(sectorId: string) {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .eq('id', sectorId)
      .single();

    if (error) throw error;
    return data as Sector;
  },

  async create(sector: Omit<Sector, 'id'>) {
    const { data, error } = await supabase
      .from('sectors')
      .insert(sector)
      .select()
      .single();

    if (error) throw error;
    return data as Sector;
  },

  async update(sectorId: string, updates: Partial<Sector>) {
    const { data, error } = await supabase
      .from('sectors')
      .update(updates)
      .eq('id', sectorId)
      .select()
      .single();

    if (error) throw error;
    return data as Sector;
  },

  async delete(sectorId: string) {
    const { error } = await supabase
      .from('sectors')
      .delete()
      .eq('id', sectorId);

    if (error) throw error;
  },
};
