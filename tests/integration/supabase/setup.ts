import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// IDs fixos para testes
export const TEST_IDS = {
  TENANT: '11111111-1111-1111-1111-111111111111',
  ADMIN: '22222222-2222-2222-2222-222222222222',
  OPERATOR: '33333333-3333-3333-3333-333333333333',
  EVENT: '44444444-4444-4444-4444-444444444444',
  // IDs dinâmicos para testes
  TEST_TENANT: '99999999-9999-9999-9999-999999999999',
  TEST_EVENT: '88888888-8888-8888-8888-888888888888',
  TEST_SECTOR: '77777777-7777-7777-7777-777777777777',
  TEST_TYPE: '66666666-6666-6666-6666-666666666666',
  TEST_LOT: '55555555-5555-5555-5555-555555555555',
} as const;

// Cliente Supabase para testes (anônimo)
export const createTestClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
};

// Cliente autenticado (mock - para testes de RLS)
export const createAuthenticatedClient = (userId: string) => {
  const client = createTestClient();
  // Em testes reais, você faria login com auth
  // Para estes testes, vamos simular políticas via service role ou dados públicos
  return client;
};

// Limpar dados de teste
export const cleanupTestData = async (client: ReturnType<typeof createTestClient>) => {
  // Deletar em ordem reversa por causa de FKs
  await client.from('lots').delete().eq('tenant_id', TEST_IDS.TEST_TENANT);
  await client.from('ticket_types').delete().eq('tenant_id', TEST_IDS.TEST_TENANT);
  await client.from('sectors').delete().eq('tenant_id', TEST_IDS.TEST_TENANT);
  await client.from('coupons').delete().eq('tenant_id', TEST_IDS.TEST_TENANT);
  await client.from('events').delete().eq('tenant_id', TEST_IDS.TEST_TENANT);
  await client.from('tenants').delete().eq('id', TEST_IDS.TEST_TENANT);
};
