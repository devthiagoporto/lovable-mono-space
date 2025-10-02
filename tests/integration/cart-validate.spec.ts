import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cartService, CartValidationRequest } from '@/services/cart';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Cart Validation - Integration Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockEventId = 'event-456';
  const mockTicketTypeId = 'type-789';
  const mockLotId = 'lot-abc';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Disponibilidade por Lote', () => {
    it('should succeed when stock is sufficient', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 5 },
        ],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 5,
          byType: [{ ticketTypeId: mockTicketTypeId, qty: 5 }],
          byLot: [{ lotId: mockLotId, qty: 5 }],
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.totalItems).toBe(5);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('cart-validate', {
        body: request,
      });
    });

    it('should fail with LOTE_SEM_ESTOQUE when stock is insufficient', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 100 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LOTE_SEM_ESTOQUE',
            lotId: mockLotId,
            message: 'Lote "1º Lote VIP" não tem estoque suficiente. Disponível: 10, solicitado: 100',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe('LOTE_SEM_ESTOQUE');
      expect(result.errors![0].lotId).toBe(mockLotId);
      expect(result.errors![0].message).toContain('estoque suficiente');
    });
  });

  describe('2. Janelas de Venda', () => {
    it('should fail with LOTE_FORA_DA_JANELA when before inicio_vendas', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LOTE_FORA_DA_JANELA',
            lotId: mockLotId,
            message: 'Lote "2º Lote" ainda não está disponível para venda. Início: 01/12/2025 00:00:00',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LOTE_FORA_DA_JANELA');
      expect(result.errors![0].message).toContain('não está disponível');
    });

    it('should fail with LOTE_FORA_DA_JANELA when after fim_vendas', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LOTE_FORA_DA_JANELA',
            lotId: mockLotId,
            message: 'Lote "1º Lote" não está mais disponível para venda. Fim: 30/11/2025 23:59:59',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LOTE_FORA_DA_JANELA');
      expect(result.errors![0].message).toContain('não está mais disponível');
    });
  });

  describe('3. Limites por Pedido', () => {
    it('should fail with LIMIT_MAX_TOTAL_POR_PEDIDO when exceeding total limit', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 11 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LIMIT_MAX_TOTAL_POR_PEDIDO',
            message: 'Quantidade máxima total por pedido é 10. Você está tentando comprar 11.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LIMIT_MAX_TOTAL_POR_PEDIDO');
      expect(result.errors![0].message).toContain('máxima total por pedido');
    });

    it('should fail with LIMIT_MAX_POR_TIPO_POR_PEDIDO when exceeding type limit', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 3 },
          { ticketTypeId: mockTicketTypeId, lotId: 'lot-def', quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LIMIT_MAX_POR_TIPO_POR_PEDIDO',
            ticketTypeId: mockTicketTypeId,
            message: 'Quantidade máxima por pedido para "Inteira Pista" é 4. Você está tentando comprar 5.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LIMIT_MAX_POR_TIPO_POR_PEDIDO');
      expect(result.errors![0].ticketTypeId).toBe(mockTicketTypeId);
      expect(result.errors![0].message).toContain('máxima por pedido');
    });
  });

  describe('4. Limites por CPF', () => {
    const cpfWithFormatting = '123.456.789-00';
    const cpfWithSpaces = '123 456 789 00';
    const cpfNormalized = '12345678900';

    it('should fail with LIMIT_MAX_POR_CPF_POR_TIPO when CPF exceeds type limit', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: cpfNormalized,
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 3 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LIMIT_MAX_POR_CPF_POR_TIPO',
            ticketTypeId: mockTicketTypeId,
            message: 'CPF já possui 2 ingresso(s) do tipo "Inteira Pista". Limite: 4. Tentando adicionar: 3.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LIMIT_MAX_POR_CPF_POR_TIPO');
      expect(result.errors![0].ticketTypeId).toBe(mockTicketTypeId);
      expect(result.errors![0].message).toContain('CPF já possui');
    });

    it('should fail with LIMIT_MAX_POR_CPF_NO_EVENTO when CPF exceeds event limit', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: cpfNormalized,
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LIMIT_MAX_POR_CPF_NO_EVENTO',
            message: 'CPF já possui 3 ingresso(s) neste evento. Limite total: 4. Tentando adicionar: 2.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LIMIT_MAX_POR_CPF_NO_EVENTO');
      expect(result.errors![0].message).toContain('Limite total');
    });

    it('should normalize CPF with dots and dashes', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: cpfWithFormatting,
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [{ ticketTypeId: mockTicketTypeId, qty: 2 }],
          byLot: [{ lotId: mockLotId, qty: 2 }],
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      // Edge function should receive and normalize the CPF
      expect(supabase.functions.invoke).toHaveBeenCalledWith('cart-validate', {
        body: expect.objectContaining({
          buyerCpf: cpfWithFormatting, // Frontend sends as-is
        }),
      });
    });

    it('should normalize CPF with spaces', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: cpfWithSpaces,
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [{ ticketTypeId: mockTicketTypeId, qty: 2 }],
          byLot: [{ lotId: mockLotId, qty: 2 }],
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
    });

    it('should fail with INVALID_CPF for invalid CPF', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '123',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'INVALID_CPF',
            message: 'CPF inválido. Deve conter 11 dígitos numéricos.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('INVALID_CPF');
    });
  });

  describe('5. Multiple Errors', () => {
    it('should return multiple errors when multiple validations fail', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 100 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LOTE_SEM_ESTOQUE',
            lotId: mockLotId,
            message: 'Lote "VIP" não tem estoque suficiente. Disponível: 5, solicitado: 100',
          },
          {
            code: 'LIMIT_MAX_TOTAL_POR_PEDIDO',
            message: 'Quantidade máxima total por pedido é 10. Você está tentando comprar 100.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors![0].code).toBe('LOTE_SEM_ESTOQUE');
      expect(result.errors![1].code).toBe('LIMIT_MAX_TOTAL_POR_PEDIDO');
    });
  });

  describe('6. Success with Warnings', () => {
    it('should succeed with capacity warning', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 5 },
        ],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 5,
          byType: [{ ticketTypeId: mockTicketTypeId, qty: 5 }],
          byLot: [{ lotId: mockLotId, qty: 5 }],
          warnings: [
            'Atenção: O setor "Pista" tem capacidade de 1000, mas 1200 ingressos foram alocados nos lotes. A capacidade pode ser excedida.',
          ],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.warnings).toHaveLength(1);
      expect(result.summary?.warnings[0]).toContain('capacidade');
    });
  });

  describe('7. Response Structure Validation', () => {
    it('should have correct structure for successful response', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 2 },
        ],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [{ ticketTypeId: mockTicketTypeId, qty: 2 }],
          byLot: [{ lotId: mockLotId, qty: 2 }],
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      // Verify structure
      expect(result).toHaveProperty('ok');
      expect(result.ok).toBe(true);
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalItems');
      expect(result.summary).toHaveProperty('byType');
      expect(result.summary).toHaveProperty('byLot');
      expect(result.summary).toHaveProperty('warnings');
      expect(Array.isArray(result.summary!.byType)).toBe(true);
      expect(Array.isArray(result.summary!.byLot)).toBe(true);
      expect(Array.isArray(result.summary!.warnings)).toBe(true);
    });

    it('should have correct structure for error response', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId, lotId: mockLotId, quantity: 100 },
        ],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LOTE_SEM_ESTOQUE',
            lotId: mockLotId,
            message: 'Lote "VIP" não tem estoque suficiente. Disponível: 5, solicitado: 100',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      // Verify structure
      expect(result).toHaveProperty('ok');
      expect(result.ok).toBe(false);
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors![0]).toHaveProperty('code');
      expect(result.errors![0]).toHaveProperty('message');
      expect(result.errors![0]).toHaveProperty('lotId');
    });
  });
});
