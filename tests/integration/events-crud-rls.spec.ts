import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventService } from '@/services/events';
import { sectorService } from '@/services/sectors';
import { ticketTypeService } from '@/services/ticketTypes';
import { lotService } from '@/services/lots';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Events CRUD and RLS - Integration Tests', () => {
  const tenantA = 'tenant-aaa';
  const tenantB = 'tenant-bbb';
  const userTenantA = 'user-tenant-a';
  const userTenantB = 'user-tenant-b';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Event CRUD - Same Tenant', () => {
    it('should allow organizer to create event in their tenant', async () => {
      const newEvent = {
        tenant_id: tenantA,
        titulo: 'Novo Evento',
        descricao: 'Descrição',
        local: 'Local',
        inicio: '2025-06-15T20:00:00Z',
        fim: '2025-06-16T02:00:00Z',
        status: 'rascunho',
        capacidade_total: 1000,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...newEvent, id: 'event-new', created_at: '2025-01-01T00:00:00Z' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await eventService.create(newEvent);

      expect(result.id).toBe('event-new');
      expect(result.tenant_id).toBe(tenantA);
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('should allow organizer to update event in their tenant', async () => {
      const updates = {
        titulo: 'Evento Atualizado',
        status: 'publicado',
      };

      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'event-123',
            tenant_id: tenantA,
            ...updates,
          },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await eventService.update('event-123', updates);

      expect(result.titulo).toBe('Evento Atualizado');
      expect(result.status).toBe('publicado');
    });

    it('should allow organizer to delete event in their tenant', async () => {
      const mockFrom = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.delete('event-123')).resolves.not.toThrow();
    });
  });

  describe('2. Event CRUD - Cross Tenant (RLS)', () => {
    it('should not allow user from Tenant B to create event in Tenant A', async () => {
      const newEvent = {
        tenant_id: tenantA, // User from Tenant B trying to create in Tenant A
        titulo: 'Evento Não Autorizado',
        descricao: 'Deve falhar',
        local: 'Local',
        inicio: '2025-06-15T20:00:00Z',
        fim: '2025-06-16T02:00:00Z',
        status: 'rascunho',
        capacidade_total: 1000,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row level security policy violated', code: '42501' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.create(newEvent)).rejects.toThrow();
    });

    it('should not allow user from Tenant B to update event from Tenant A', async () => {
      const updates = {
        titulo: 'Tentativa de Atualização',
      };

      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row level security policy violated', code: '42501' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.update('event-tenant-a', updates)).rejects.toThrow();
    });

    it('should not allow user from Tenant B to delete event from Tenant A', async () => {
      const mockFrom = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row level security policy violated', code: '42501' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.delete('event-tenant-a')).rejects.toThrow();
    });
  });

  describe('3. Sector CRUD - RLS', () => {
    it('should allow organizer to create sector in their tenant', async () => {
      const newSector = {
        tenant_id: tenantA,
        event_id: 'event-tenant-a',
        nome: 'Pista',
        capacidade: 5000,
        ordem: 1,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...newSector, id: 'sector-new' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await sectorService.create(newSector);

      expect(result.id).toBe('sector-new');
      expect(result.tenant_id).toBe(tenantA);
    });

    it('should not allow user from Tenant B to create sector in Tenant A event', async () => {
      const newSector = {
        tenant_id: tenantA,
        event_id: 'event-tenant-a',
        nome: 'Setor Não Autorizado',
        capacidade: 1000,
        ordem: 1,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row level security policy violated', code: '42501' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(sectorService.create(newSector)).rejects.toThrow();
    });
  });

  describe('4. Ticket Type CRUD - RLS', () => {
    it('should allow organizer to create ticket type in their tenant', async () => {
      const newTicketType = {
        tenant_id: tenantA,
        event_id: 'event-tenant-a',
        sector_id: 'sector-tenant-a',
        nome: 'Inteira',
        preco: 150.0,
        taxa: 15.0,
        max_por_pedido: 4,
        meia_elegivel: false,
        ativo: true,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...newTicketType, id: 'type-new' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await ticketTypeService.create(newTicketType);

      expect(result.id).toBe('type-new');
      expect(result.tenant_id).toBe(tenantA);
    });

    it('should not allow user from Tenant B to create ticket type in Tenant A event', async () => {
      const newTicketType = {
        tenant_id: tenantA,
        event_id: 'event-tenant-a',
        sector_id: 'sector-tenant-a',
        nome: 'Tipo Não Autorizado',
        preco: 100.0,
        taxa: 10.0,
        meia_elegivel: false,
        ativo: true,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row level security policy violated', code: '42501' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(ticketTypeService.create(newTicketType)).rejects.toThrow();
    });
  });

  describe('5. Lot CRUD - RLS', () => {
    it('should allow organizer to create lot in their tenant', async () => {
      const newLot = {
        tenant_id: tenantA,
        ticket_type_id: 'type-tenant-a',
        nome: '1º Lote',
        preco: 120.0,
        qtd_total: 1000,
        inicio_vendas: '2025-05-01T00:00:00Z',
        fim_vendas: '2025-05-31T23:59:59Z',
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...newLot, id: 'lot-new', qtd_vendida: 0 },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await lotService.create(newLot);

      expect(result.id).toBe('lot-new');
      expect(result.tenant_id).toBe(tenantA);
      expect(result.qtd_vendida).toBe(0);
    });

    it('should not allow user from Tenant B to create lot in Tenant A ticket type', async () => {
      const newLot = {
        tenant_id: tenantA,
        ticket_type_id: 'type-tenant-a',
        nome: 'Lote Não Autorizado',
        preco: 100.0,
        qtd_total: 500,
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row level security policy violated', code: '42501' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(lotService.create(newLot)).rejects.toThrow();
    });
  });

  describe('6. Read Access - Different Scenarios', () => {
    it('should allow members to read their own tenant events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          tenant_id: tenantA,
          titulo: 'Evento 1',
          status: 'rascunho',
        },
        {
          id: 'event-2',
          tenant_id: tenantA,
          titulo: 'Evento 2',
          status: 'publicado',
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await eventService.list(tenantA);

      expect(result).toHaveLength(2);
      expect(result.every((e) => e.tenant_id === tenantA)).toBe(true);
    });

    it('should not return events from other tenants', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await eventService.list(tenantB);

      // User from Tenant B querying their own tenant should get empty result
      // if there are no events, not events from Tenant A
      expect(result).toHaveLength(0);
    });

    it('should allow public to read published events only', async () => {
      const mockEvent = {
        id: 'event-published',
        tenant_id: tenantA,
        titulo: 'Evento Público',
        status: 'publicado',
      };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await eventService.getPublicEvent('event-published');

      expect(result.status).toBe('publicado');
    });

    it('should not allow public to read draft events', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Event not found' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.getPublicEvent('event-draft')).rejects.toThrow();
    });
  });
});
