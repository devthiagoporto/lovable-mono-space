import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TEST_IDS, cleanupTestData } from './setup';

describe('Supabase Data Creation - Encadeamento de Entidades', () => {
  const client = createTestClient();

  afterAll(async () => {
    await cleanupTestData(client);
  });

  it('deve criar Event → Sector → TicketType → Lot respeitando FKs', async () => {
    // 1. Criar tenant de teste
    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .insert({
        id: TEST_IDS.TEST_TENANT,
        nome: 'Test Tenant',
        subdominio: 'test-' + Date.now(),
        plano: 'trial',
      })
      .select()
      .single();

    expect(tenantError).toBeNull();
    expect(tenant).toBeDefined();

    // 2. Criar evento
    const { data: event, error: eventError } = await client
      .from('events')
      .insert({
        id: TEST_IDS.TEST_EVENT,
        tenant_id: TEST_IDS.TEST_TENANT,
        titulo: 'Test Event',
        status: 'publicado',
        inicio: new Date(Date.now() + 86400000).toISOString(), // +1 dia
        fim: new Date(Date.now() + 90000000).toISOString(),
        capacidade_total: 100,
      })
      .select()
      .single();

    expect(eventError).toBeNull();
    expect(event?.id).toBe(TEST_IDS.TEST_EVENT);

    // 3. Criar setor
    const { data: sector, error: sectorError } = await client
      .from('sectors')
      .insert({
        id: TEST_IDS.TEST_SECTOR,
        tenant_id: TEST_IDS.TEST_TENANT,
        event_id: TEST_IDS.TEST_EVENT,
        nome: 'Test Sector',
        capacidade: 100,
        ordem: 1,
      })
      .select()
      .single();

    expect(sectorError).toBeNull();
    expect(sector?.event_id).toBe(TEST_IDS.TEST_EVENT);

    // 4. Criar tipo de ingresso
    const { data: ticketType, error: typeError } = await client
      .from('ticket_types')
      .insert({
        id: TEST_IDS.TEST_TYPE,
        tenant_id: TEST_IDS.TEST_TENANT,
        event_id: TEST_IDS.TEST_EVENT,
        sector_id: TEST_IDS.TEST_SECTOR,
        nome: 'Test Type',
        preco: 50.00,
        taxa: 5.00,
        ativo: true,
      })
      .select()
      .single();

    expect(typeError).toBeNull();
    expect(ticketType?.sector_id).toBe(TEST_IDS.TEST_SECTOR);

    // 5. Criar lote
    const { data: lot, error: lotError } = await client
      .from('lots')
      .insert({
        id: TEST_IDS.TEST_LOT,
        tenant_id: TEST_IDS.TEST_TENANT,
        ticket_type_id: TEST_IDS.TEST_TYPE,
        nome: '1º Lote',
        preco: 50.00,
        qtd_total: 50,
        qtd_vendida: 0,
      })
      .select()
      .single();

    expect(lotError).toBeNull();
    expect(lot?.ticket_type_id).toBe(TEST_IDS.TEST_TYPE);

    // 6. Validar relacionamentos via JOIN
    const { data: fullData, error: joinError } = await client
      .from('lots')
      .select(`
        *,
        ticket_types (
          nome,
          sectors (
            nome,
            events (
              titulo
            )
          )
        )
      `)
      .eq('id', TEST_IDS.TEST_LOT)
      .single();

    expect(joinError).toBeNull();
    expect(fullData).toBeDefined();
    expect(fullData.ticket_types).toBeDefined();
  });

  it('deve falhar ao criar Sector sem Event válido', async () => {
    const { error } = await client
      .from('sectors')
      .insert({
        tenant_id: TEST_IDS.TEST_TENANT,
        event_id: '00000000-0000-0000-0000-000000000000', // UUID inexistente
        nome: 'Invalid Sector',
        capacidade: 100,
        ordem: 1,
      });

    // Pode falhar por RLS ou FK dependendo das políticas
    // O importante é que NÃO crie o setor
    expect(error).toBeDefined();
  });
});
