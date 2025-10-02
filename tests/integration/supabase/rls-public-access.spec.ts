import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TEST_IDS, cleanupTestData } from './setup';

describe('Supabase RLS - Acesso Público a Eventos Publicados', () => {
  const anonClient = createTestClient(); // Cliente anônimo

  beforeAll(async () => {
    // Setup: criar tenant e eventos com status diferentes
    await anonClient.from('tenants').upsert({
      id: TEST_IDS.TEST_TENANT,
      nome: 'Test Tenant RLS',
      subdominio: 'test-rls-' + Date.now(),
      plano: 'trial',
    });

    // Evento publicado (deve ser visível)
    await anonClient.from('events').upsert({
      id: TEST_IDS.TEST_EVENT,
      tenant_id: TEST_IDS.TEST_TENANT,
      titulo: 'Evento Público',
      status: 'publicado',
      inicio: new Date(Date.now() + 86400000).toISOString(),
      fim: new Date(Date.now() + 90000000).toISOString(),
      capacidade_total: 500,
    });

    // Evento rascunho (NÃO deve ser visível publicamente)
    await anonClient.from('events').upsert({
      id: '33333333-3333-3333-3333-333333333333',
      tenant_id: TEST_IDS.TEST_TENANT,
      titulo: 'Evento Rascunho',
      status: 'rascunho',
      inicio: new Date(Date.now() + 86400000).toISOString(),
      fim: new Date(Date.now() + 90000000).toISOString(),
      capacidade_total: 200,
    });
  });

  afterAll(async () => {
    await anonClient.from('events').delete().eq('id', '33333333-3333-3333-3333-333333333333');
    await cleanupTestData(anonClient);
  });

  it('deve permitir leitura pública de eventos com status=publicado', async () => {
    const { data, error } = await anonClient
      .from('events')
      .select('*')
      .eq('status', 'publicado');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThan(0);
    
    const publicEvent = data?.find(e => e.id === TEST_IDS.TEST_EVENT);
    expect(publicEvent).toBeDefined();
    expect(publicEvent?.titulo).toBe('Evento Público');
  });

  it('deve BLOQUEAR leitura de eventos com status=rascunho para usuário anônimo', async () => {
    const { data, error } = await anonClient
      .from('events')
      .select('*')
      .eq('id', '33333333-3333-3333-3333-333333333333');

    // RLS deve bloquear ou retornar vazio
    if (error) {
      expect(error).toBeDefined();
    } else {
      expect(data?.length).toBe(0);
    }
  });

  it('deve BLOQUEAR inserção anônima de eventos', async () => {
    const { error } = await anonClient
      .from('events')
      .insert({
        tenant_id: TEST_IDS.TEST_TENANT,
        titulo: 'Evento Malicioso',
        status: 'publicado',
        inicio: new Date(Date.now() + 86400000).toISOString(),
        fim: new Date(Date.now() + 90000000).toISOString(),
        capacidade_total: 100,
      });

    expect(error).toBeDefined();
    expect(error?.code).toMatch(/42501|PGRST301/); // Insufficient privilege ou policy violation
  });

  it('deve BLOQUEAR update anônimo de eventos publicados', async () => {
    const { error } = await anonClient
      .from('events')
      .update({ titulo: 'Evento Hackeado' })
      .eq('id', TEST_IDS.TEST_EVENT);

    expect(error).toBeDefined();
    expect(error?.code).toMatch(/42501|PGRST301/);
  });

  it('deve BLOQUEAR delete anônimo de eventos', async () => {
    const { error } = await anonClient
      .from('events')
      .delete()
      .eq('id', TEST_IDS.TEST_EVENT);

    expect(error).toBeDefined();
    expect(error?.code).toMatch(/42501|PGRST301/);
  });

  it('deve permitir leitura pública de setores de eventos publicados', async () => {
    // Criar setor para evento público
    const sectorId = '22222222-2222-2222-2222-222222222222';
    await anonClient.from('sectors').insert({
      id: sectorId,
      tenant_id: TEST_IDS.TEST_TENANT,
      event_id: TEST_IDS.TEST_EVENT,
      nome: 'Setor Teste',
      capacidade: 100,
      ordem: 1,
    });

    const { data, error } = await anonClient
      .from('sectors')
      .select('*')
      .eq('event_id', TEST_IDS.TEST_EVENT);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    
    // Cleanup
    await anonClient.from('sectors').delete().eq('id', sectorId);
  });
});
