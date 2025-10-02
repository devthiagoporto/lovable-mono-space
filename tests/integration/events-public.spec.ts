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

describe('Events Public Catalog - Integration Tests', () => {
  const mockPublishedEventId = 'event-published';
  const mockDraftEventId = 'event-draft';
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Public Event Access', () => {
    it('should return published event', async () => {
      const mockEvent = {
        id: mockPublishedEventId,
        tenant_id: mockTenantId,
        titulo: 'Show de Rock 2025',
        descricao: 'Melhor show do ano',
        local: 'Arena Central',
        inicio: '2025-06-15T20:00:00Z',
        fim: '2025-06-16T02:00:00Z',
        status: 'publicado',
        capacidade_total: 10000,
        regras_limite: {
          maxTotalPorPedido: 10,
        },
        created_at: '2025-01-01T00:00:00Z',
      };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await eventService.getPublicEvent(mockPublishedEventId);

      expect(result).toEqual(mockEvent);
      expect(supabase.from).toHaveBeenCalledWith('events');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', mockPublishedEventId);
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'publicado');
    });

    it('should not return draft event', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Event not found' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.getPublicEvent(mockDraftEventId)).rejects.toThrow();
    });

    it('should not return cancelled event', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Event not found' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(eventService.getPublicEvent('event-cancelled')).rejects.toThrow();
    });
  });

  describe('2. Sectors for Published Event', () => {
    it('should return sectors for published event', async () => {
      const mockSectors = [
        {
          id: 'sector-1',
          tenant_id: mockTenantId,
          event_id: mockPublishedEventId,
          nome: 'Pista',
          capacidade: 5000,
          ordem: 1,
        },
        {
          id: 'sector-2',
          tenant_id: mockTenantId,
          event_id: mockPublishedEventId,
          nome: 'Camarote',
          capacidade: 500,
          ordem: 2,
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSectors, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await sectorService.list(mockPublishedEventId);

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Pista');
      expect(result[1].nome).toBe('Camarote');
    });
  });

  describe('3. Ticket Types for Published Event', () => {
    it('should return active ticket types for published event', async () => {
      const mockTicketTypes = [
        {
          id: 'type-1',
          tenant_id: mockTenantId,
          event_id: mockPublishedEventId,
          sector_id: 'sector-1',
          nome: 'Inteira',
          preco: 150.0,
          taxa: 15.0,
          max_por_pedido: 4,
          meia_elegivel: false,
          ativo: true,
          sectors: { nome: 'Pista' },
        },
        {
          id: 'type-2',
          tenant_id: mockTenantId,
          event_id: mockPublishedEventId,
          sector_id: 'sector-1',
          nome: 'Meia',
          preco: 75.0,
          taxa: 7.5,
          max_por_pedido: 2,
          meia_elegivel: true,
          ativo: true,
          sectors: { nome: 'Pista' },
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTicketTypes, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await ticketTypeService.list(mockPublishedEventId);

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.ativo)).toBe(true);
    });
  });

  describe('4. Lots with Availability', () => {
    it('should return lots with available stock', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          tenant_id: mockTenantId,
          ticket_type_id: 'type-1',
          nome: '1º Lote',
          preco: 120.0,
          qtd_total: 1000,
          qtd_vendida: 500,
          inicio_vendas: '2025-05-01T00:00:00Z',
          fim_vendas: '2025-05-31T23:59:59Z',
        },
        {
          id: 'lot-2',
          tenant_id: mockTenantId,
          ticket_type_id: 'type-1',
          nome: '2º Lote',
          preco: 150.0,
          qtd_total: 1000,
          qtd_vendida: 0,
          inicio_vendas: '2025-06-01T00:00:00Z',
          fim_vendas: '2025-06-14T23:59:59Z',
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLots, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await lotService.list('type-1');

      expect(result).toHaveLength(2);
      expect(result[0].qtd_total - result[0].qtd_vendida).toBe(500); // 500 available
      expect(result[1].qtd_total - result[1].qtd_vendida).toBe(1000); // 1000 available
    });

    it('should show sold out lots', async () => {
      const mockLots = [
        {
          id: 'lot-sold-out',
          tenant_id: mockTenantId,
          ticket_type_id: 'type-1',
          nome: 'Lote Esgotado',
          preco: 100.0,
          qtd_total: 100,
          qtd_vendida: 100,
          inicio_vendas: '2025-05-01T00:00:00Z',
          fim_vendas: '2025-05-31T23:59:59Z',
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLots, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await lotService.list('type-1');

      expect(result).toHaveLength(1);
      expect(result[0].qtd_vendida).toBe(result[0].qtd_total);
    });
  });

  describe('5. Complete Public Catalog Flow', () => {
    it('should load complete event catalog (event -> sectors -> types -> lots)', async () => {
      const mockEvent = {
        id: mockPublishedEventId,
        tenant_id: mockTenantId,
        titulo: 'Show de Rock 2025',
        status: 'publicado',
        capacidade_total: 10000,
      };

      const mockSectors = [
        {
          id: 'sector-1',
          tenant_id: mockTenantId,
          event_id: mockPublishedEventId,
          nome: 'Pista',
          capacidade: 5000,
          ordem: 1,
        },
      ];

      const mockTicketTypes = [
        {
          id: 'type-1',
          tenant_id: mockTenantId,
          event_id: mockPublishedEventId,
          sector_id: 'sector-1',
          nome: 'Inteira',
          preco: 150.0,
          taxa: 15.0,
          max_por_pedido: 4,
          meia_elegivel: false,
          ativo: true,
          sectors: { nome: 'Pista' },
        },
      ];

      const mockLots = [
        {
          id: 'lot-1',
          tenant_id: mockTenantId,
          ticket_type_id: 'type-1',
          nome: '1º Lote',
          preco: 120.0,
          qtd_total: 1000,
          qtd_vendida: 500,
          inicio_vendas: '2025-05-01T00:00:00Z',
          fim_vendas: '2025-05-31T23:59:59Z',
        },
      ];

      // Mock multiple calls with different responses
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          } as any;
        } else if (table === 'sectors') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSectors, error: null }),
          } as any;
        } else if (table === 'ticket_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTicketTypes, error: null }),
          } as any;
        } else if (table === 'lots') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockLots, error: null }),
          } as any;
        }
        return {} as any;
      });

      // Load complete catalog
      const event = await eventService.getPublicEvent(mockPublishedEventId);
      const sectors = await sectorService.list(mockPublishedEventId);
      const ticketTypes = await ticketTypeService.list(mockPublishedEventId);
      const lots = await lotService.list('type-1');

      // Verify complete flow
      expect(event.status).toBe('publicado');
      expect(sectors).toHaveLength(1);
      expect(ticketTypes).toHaveLength(1);
      expect(lots).toHaveLength(1);
      expect(lots[0].qtd_total - lots[0].qtd_vendida).toBeGreaterThan(0);
    });
  });
});
