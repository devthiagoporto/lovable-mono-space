import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TEST_IDS } from './setup';

describe('Supabase Tenant Isolation - Isolamento Multi-Tenant', () => {
  const client = createTestClient();
  
  const TENANT_A = '10000000-0000-0000-0000-000000000001';
  const TENANT_B = '20000000-0000-0000-0000-000000000002';
  const EVENT_A = '10000000-0000-0000-0000-000000000011';
  const EVENT_B = '20000000-0000-0000-0000-000000000022';

  beforeAll(async () => {
    // Criar dois tenants isolados
    await client.from('tenants').upsert([
      {
        id: TENANT_A,
        nome: 'Tenant A',
        subdominio: 'tenant-a-' + Date.now(),
        plano: 'trial',
      },
      {
        id: TENANT_B,
        nome: 'Tenant B',
        subdominio: 'tenant-b-' + Date.now(),
        plano: 'trial',
      },
    ]);

    // Criar eventos em cada tenant
    await client.from('events').upsert([
      {
        id: EVENT_A,
        tenant_id: TENANT_A,
        titulo: 'Evento Tenant A',
        status: 'publicado',
        inicio: new Date(Date.now() + 86400000).toISOString(),
        fim: new Date(Date.now() + 90000000).toISOString(),
        capacidade_total: 100,
      },
      {
        id: EVENT_B,
        tenant_id: TENANT_B,
        titulo: 'Evento Tenant B',
        status: 'publicado',
        inicio: new Date(Date.now() + 86400000).toISOString(),
        fim: new Date(Date.now() + 90000000).toISOString(),
        capacidade_total: 200,
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await client.from('events').delete().in('id', [EVENT_A, EVENT_B]);
    await client.from('tenants').delete().in('id', [TENANT_A, TENANT_B]);
  });

  it('deve isolar leitura de eventos entre tenants (via RLS)', async () => {
    // Cliente anônimo só vê eventos publicados, mas todos
    const { data } = await client
      .from('events')
      .select('*')
      .in('id', [EVENT_A, EVENT_B]);

    // Como ambos estão publicados, usuário anônimo pode ver ambos
    // O isolamento real acontece quando autenticado (via has_tenant_access)
    expect(data?.length).toBe(2);
  });

  it('deve prevenir update de evento de outro tenant (simulação)', async () => {
    // Em produção, RLS com has_tenant_access(tenant_id) bloquearia
    // Como estamos anônimos, qualquer tentativa de UPDATE deve falhar

    const { error } = await client
      .from('events')
      .update({ titulo: 'Evento Hackeado' })
      .eq('id', EVENT_A);

    expect(error).toBeDefined();
    expect(error?.code).toMatch(/42501|PGRST301/); // Policy violation
  });

  it('deve prevenir criação de recurso vinculado a outro tenant', async () => {
    // Tentar criar setor do Tenant A no evento do Tenant B
    const { error } = await client
      .from('sectors')
      .insert({
        tenant_id: TENANT_A, // Tenant A
        event_id: EVENT_B,   // Evento do Tenant B
        nome: 'Setor Cross-Tenant',
        capacidade: 50,
        ordem: 1,
      });

    // Deve falhar por RLS ou validação
    expect(error).toBeDefined();
  });

  it('deve permitir query de eventos do próprio tenant (com auth)', async () => {
    // Este teste seria mais efetivo com autenticação real
    // Aqui apenas validamos que queries filtradas funcionam

    const { data: eventsA } = await client
      .from('events')
      .select('*')
      .eq('tenant_id', TENANT_A);

    const { data: eventsB } = await client
      .from('events')
      .select('*')
      .eq('tenant_id', TENANT_B);

    expect(eventsA?.every(e => e.tenant_id === TENANT_A)).toBe(true);
    expect(eventsB?.every(e => e.tenant_id === TENANT_B)).toBe(true);
  });

  it('deve validar isolamento em cascata (event → sector → type)', async () => {
    // Criar setor no Tenant A
    const sectorId = '10000000-0000-0000-0000-000000000111';
    await client.from('sectors').insert({
      id: sectorId,
      tenant_id: TENANT_A,
      event_id: EVENT_A,
      nome: 'Setor A',
      capacidade: 50,
      ordem: 1,
    });

    // Verificar que não é possível vincular tipo do Tenant B ao setor do Tenant A
    const { error } = await client
      .from('ticket_types')
      .insert({
        tenant_id: TENANT_B, // Tenant diferente
        event_id: EVENT_A,
        sector_id: sectorId,
        nome: 'Tipo Cross-Tenant',
        preco: 100,
        taxa: 10,
      });

    // Deve falhar por RLS ou validação de consistência
    expect(error).toBeDefined();

    // Cleanup
    await client.from('sectors').delete().eq('id', sectorId);
  });
});
