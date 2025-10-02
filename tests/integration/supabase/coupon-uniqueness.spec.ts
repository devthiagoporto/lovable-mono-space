import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TEST_IDS, cleanupTestData } from './setup';

describe('Supabase Coupon Uniqueness - Constraint de código único por evento', () => {
  const client = createTestClient();

  beforeAll(async () => {
    // Garantir que temos tenant e evento
    await client.from('tenants').upsert({
      id: TEST_IDS.TEST_TENANT,
      nome: 'Test Tenant',
      subdominio: 'test-coupon-' + Date.now(),
      plano: 'trial',
    });

    await client.from('events').upsert({
      id: TEST_IDS.TEST_EVENT,
      tenant_id: TEST_IDS.TEST_TENANT,
      titulo: 'Test Event Coupon',
      status: 'publicado',
      inicio: new Date(Date.now() + 86400000).toISOString(),
      fim: new Date(Date.now() + 90000000).toISOString(),
      capacidade_total: 100,
    });
  });

  afterAll(async () => {
    await cleanupTestData(client);
  });

  it('deve criar cupom com código único para o evento', async () => {
    const { data, error } = await client
      .from('coupons')
      .insert({
        tenant_id: TEST_IDS.TEST_TENANT,
        event_id: TEST_IDS.TEST_EVENT,
        codigo: 'TESTE10',
        tipo: 'percentual',
        valor: 10,
        ativo: true,
        combinavel: false,
        uso_total: 0,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.codigo).toBe('TESTE10');
  });

  it('deve FALHAR ao inserir código duplicado no mesmo evento', async () => {
    // Primeira inserção
    await client.from('coupons').insert({
      tenant_id: TEST_IDS.TEST_TENANT,
      event_id: TEST_IDS.TEST_EVENT,
      codigo: 'DUPLICADO',
      tipo: 'valor',
      valor: 20,
      ativo: true,
      combinavel: false,
      uso_total: 0,
    });

    // Segunda inserção (deve falhar)
    const { error } = await client
      .from('coupons')
      .insert({
        tenant_id: TEST_IDS.TEST_TENANT,
        event_id: TEST_IDS.TEST_EVENT,
        codigo: 'DUPLICADO', // Mesmo código
        tipo: 'cortesia',
        valor: 100,
        ativo: true,
        combinavel: false,
        uso_total: 0,
      });

    expect(error).toBeDefined();
    expect(error?.code).toBe('23505'); // Unique constraint violation
  });

  it('deve PERMITIR mesmo código em eventos diferentes', async () => {
    // Criar segundo evento
    const eventId2 = '77777777-7777-7777-7777-777777777777';
    await client.from('events').insert({
      id: eventId2,
      tenant_id: TEST_IDS.TEST_TENANT,
      titulo: 'Test Event 2',
      status: 'publicado',
      inicio: new Date(Date.now() + 86400000).toISOString(),
      fim: new Date(Date.now() + 90000000).toISOString(),
      capacidade_total: 100,
    });

    // Criar cupom com mesmo código em evento diferente
    const { data, error } = await client
      .from('coupons')
      .insert({
        tenant_id: TEST_IDS.TEST_TENANT,
        event_id: eventId2,
        codigo: 'TESTE10', // Mesmo código do primeiro teste
        tipo: 'percentual',
        valor: 15,
        ativo: true,
        combinavel: false,
        uso_total: 0,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.codigo).toBe('TESTE10');

    // Cleanup
    await client.from('coupons').delete().eq('event_id', eventId2);
    await client.from('events').delete().eq('id', eventId2);
  });
});
