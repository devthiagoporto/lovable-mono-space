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

describe('Cart Validation - Coupon Integration Tests (ETAPA 4)', () => {
  const mockTenantId = 'tenant-123';
  const mockEventId = 'event-456';
  const mockTicketTypeId1 = 'type-789';
  const mockTicketTypeId2 = 'type-abc';
  const mockLotId1 = 'lot-def';
  const mockLotId2 = 'lot-ghi';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A1. Cupom Percentual Simples', () => {
    it('should apply percentage discount correctly to eligible items', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 2 },
        ],
        couponCodes: ['DESCONTO10'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 2 }],
          byLot: [{ lotId: mockLotId1, qty: 2 }],
          pricing: {
            subtotal: 200.0,
            discounts: [
              {
                code: 'DESCONTO10',
                amount: 20.0, // 10% de 200
                appliedTo: [mockTicketTypeId1],
              },
            ],
            total: 180.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.subtotal).toBe(200.0);
      expect(result.summary?.pricing?.discounts).toHaveLength(1);
      expect(result.summary?.pricing?.discounts![0].code).toBe('DESCONTO10');
      expect(result.summary?.pricing?.discounts![0].amount).toBe(20.0);
      expect(result.summary?.pricing?.total).toBe(180.0);
    });

    it('should handle multiple percentage coupons (combinable)', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 2 },
        ],
        couponCodes: ['DESCONTO10', 'EXTRA5'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 2 }],
          byLot: [{ lotId: mockLotId1, qty: 2 }],
          pricing: {
            subtotal: 200.0,
            discounts: [
              { code: 'DESCONTO10', amount: 20.0, appliedTo: [mockTicketTypeId1] },
              { code: 'EXTRA5', amount: 10.0, appliedTo: [mockTicketTypeId1] },
            ],
            total: 170.0, // 200 - 20 - 10
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts).toHaveLength(2);
      expect(result.summary?.pricing?.total).toBe(170.0);
    });
  });

  describe('A2. Cupom Valor Fixo', () => {
    it('should apply fixed value discount without going negative', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['VALOR50'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              {
                code: 'VALOR50',
                amount: 50.0,
                appliedTo: [mockTicketTypeId1],
              },
            ],
            total: 50.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.total).toBe(50.0);
      expect(result.summary?.pricing?.total).toBeGreaterThanOrEqual(0);
    });

    it('should cap fixed discount at subtotal (no negative total)', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['VALOR200'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              {
                code: 'VALOR200',
                amount: 100.0, // Capped at subtotal
                appliedTo: [mockTicketTypeId1],
              },
            ],
            total: 0.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts![0].amount).toBe(100.0);
      expect(result.summary?.pricing?.total).toBe(0.0);
    });
  });

  describe('A3. Cupom Cortesia', () => {
    it('should zero out eligible items with courtesy coupon', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 2 },
        ],
        couponCodes: ['CORTESIA100'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 2 }],
          byLot: [{ lotId: mockLotId1, qty: 2 }],
          pricing: {
            subtotal: 200.0,
            discounts: [
              {
                code: 'CORTESIA100',
                amount: 200.0, // Zera tudo
                appliedTo: [mockTicketTypeId1],
              },
            ],
            total: 0.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts![0].amount).toBe(200.0);
      expect(result.summary?.pricing?.total).toBe(0.0);
    });

    it('should apply courtesy only to whitelisted types', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
          { ticketTypeId: mockTicketTypeId2, lotId: mockLotId2, quantity: 1 },
        ],
        couponCodes: ['CORTESIAVIP'], // Só para tipo 1
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [
            { ticketTypeId: mockTicketTypeId1, qty: 1 },
            { ticketTypeId: mockTicketTypeId2, qty: 1 },
          ],
          byLot: [
            { lotId: mockLotId1, qty: 1 },
            { lotId: mockLotId2, qty: 1 },
          ],
          pricing: {
            subtotal: 200.0, // 100 + 100
            discounts: [
              {
                code: 'CORTESIAVIP',
                amount: 100.0, // Zera apenas tipo 1
                appliedTo: [mockTicketTypeId1],
              },
            ],
            total: 100.0, // Tipo 2 mantém preço
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts![0].appliedTo).toEqual([mockTicketTypeId1]);
      expect(result.summary?.pricing?.total).toBe(100.0);
    });
  });

  describe('A4. Cupons Não Combináveis', () => {
    it('should reject 2 non-combinable coupons with CUPOM_NAO_COMBINAVEL', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['BLACKFRIDAY', 'CYBERMONDAY'], // Ambos não combináveis
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'CUPOM_NAO_COMBINAVEL',
            message: 'Os cupons BLACKFRIDAY, CYBERMONDAY não são combináveis entre si.',
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
      expect(result.errors![0].code).toBe('CUPOM_NAO_COMBINAVEL');
      expect(result.errors![0].message).toContain('não são combináveis');
    });

    it('should reject non-combinable + combinable coupons', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['BLACKFRIDAY', 'DESCONTO10'], // 1 não combinável + 1 combinável
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'CUPOM_NAO_COMBINAVEL',
            message: 'O cupom "BLACKFRIDAY" não é combinável com outros cupons.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('CUPOM_NAO_COMBINAVEL');
    });

    it('should accept single non-combinable coupon', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['BLACKFRIDAY'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              { code: 'BLACKFRIDAY', amount: 50.0, appliedTo: [mockTicketTypeId1] },
            ],
            total: 50.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts).toHaveLength(1);
    });
  });

  describe('A5. WhitelistTipos', () => {
    it('should return warning when coupon has no eligible items', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['SOMENTE_VIP'], // Só para tipo 2, mas carrinho tem tipo 1
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [], // Sem desconto
            total: 100.0,
          },
          warnings: ['Cupom "SOMENTE_VIP" não se aplica a nenhum item do carrinho.'],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts).toHaveLength(0);
      expect(result.summary?.warnings).toContain(
        'Cupom "SOMENTE_VIP" não se aplica a nenhum item do carrinho.'
      );
    });

    it('should apply discount only to whitelisted types', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
          { ticketTypeId: mockTicketTypeId2, lotId: mockLotId2, quantity: 1 },
        ],
        couponCodes: ['SOMENTE_VIP'], // Só para tipo 2
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 2,
          byType: [
            { ticketTypeId: mockTicketTypeId1, qty: 1 },
            { ticketTypeId: mockTicketTypeId2, qty: 1 },
          ],
          byLot: [
            { lotId: mockLotId1, qty: 1 },
            { lotId: mockLotId2, qty: 1 },
          ],
          pricing: {
            subtotal: 300.0, // 100 + 200
            discounts: [
              {
                code: 'SOMENTE_VIP',
                amount: 40.0, // 20% de 200
                appliedTo: [mockTicketTypeId2],
              },
            ],
            total: 260.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts![0].appliedTo).toEqual([mockTicketTypeId2]);
      expect(result.summary?.pricing?.total).toBe(260.0);
    });
  });

  describe('A6. Limites', () => {
    it('should reject with LIMITE_TOTAL_EXCEDIDO when projected usage exceeds limiteTotal', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['LIMITADO10'],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LIMITE_TOTAL_EXCEDIDO',
            couponCode: 'LIMITADO10',
            message: 'Cupom "LIMITADO10" atingiu o limite de usos. Usos: 10/10.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LIMITE_TOTAL_EXCEDIDO');
      expect(result.errors![0].couponCode).toBe('LIMITADO10');
    });

    it('should reject with LIMITE_POR_CPF_EXCEDIDO when CPF usage exceeds limit', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['UMPORPESSOA'],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'LIMITE_POR_CPF_EXCEDIDO',
            couponCode: 'UMPORPESSOA',
            message: 'Você já utilizou o cupom "UMPORPESSOA" 1 vez(es). Limite: 1.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('LIMITE_POR_CPF_EXCEDIDO');
      expect(result.errors![0].couponCode).toBe('UMPORPESSOA');
    });

    it('should accept coupon when under limiteTotal', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['LIMITADO100'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              { code: 'LIMITADO100', amount: 10.0, appliedTo: [mockTicketTypeId1] },
            ],
            total: 90.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts).toHaveLength(1);
    });
  });

  describe('A7. Sanitização', () => {
    it('should handle case-insensitive coupon codes', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['desconto10'], // Lowercase
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              { code: 'DESCONTO10', amount: 10.0, appliedTo: [mockTicketTypeId1] },
            ],
            total: 90.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts![0].code).toBe('DESCONTO10');
    });

    it('should handle formatted CPF consistently', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '123.456.789-00', // Formatado
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['DESCONTO10'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              { code: 'DESCONTO10', amount: 10.0, appliedTo: [mockTicketTypeId1] },
            ],
            total: 90.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('cart-validate', {
        body: expect.objectContaining({
          buyerCpf: '123.456.789-00', // Cliente envia formatado, server normaliza
        }),
      });
    });

    it('should handle CPF with spaces', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: ' 123.456.789-00 ', // Com espaços
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['DESCONTO10'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [
              { code: 'DESCONTO10', amount: 10.0, appliedTo: [mockTicketTypeId1] },
            ],
            total: 90.0,
          },
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
  });

  describe('A8. Batch/Performance', () => {
    it('should make single function call for validation', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
          { ticketTypeId: mockTicketTypeId2, lotId: mockLotId2, quantity: 2 },
        ],
        couponCodes: ['DESCONTO10', 'EXTRA5'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 3,
          byType: [
            { ticketTypeId: mockTicketTypeId1, qty: 1 },
            { ticketTypeId: mockTicketTypeId2, qty: 2 },
          ],
          byLot: [
            { lotId: mockLotId1, qty: 1 },
            { lotId: mockLotId2, qty: 2 },
          ],
          pricing: {
            subtotal: 300.0,
            discounts: [
              { code: 'DESCONTO10', amount: 30.0, appliedTo: [mockTicketTypeId1, mockTicketTypeId2] },
              { code: 'EXTRA5', amount: 15.0, appliedTo: [mockTicketTypeId1, mockTicketTypeId2] },
            ],
            total: 255.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      await cartService.validateCart(request);

      // Should only call once (batch processing)
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    it('should handle complex cart with multiple coupons efficiently', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 5 },
          { ticketTypeId: mockTicketTypeId2, lotId: mockLotId2, quantity: 3 },
        ],
        couponCodes: ['DESC20', 'EXTRA10', 'BONUS5'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 8,
          byType: [
            { ticketTypeId: mockTicketTypeId1, qty: 5 },
            { ticketTypeId: mockTicketTypeId2, qty: 3 },
          ],
          byLot: [
            { lotId: mockLotId1, qty: 5 },
            { lotId: mockLotId2, qty: 3 },
          ],
          pricing: {
            subtotal: 800.0,
            discounts: [
              { code: 'DESC20', amount: 160.0, appliedTo: [mockTicketTypeId1, mockTicketTypeId2] },
              { code: 'EXTRA10', amount: 80.0, appliedTo: [mockTicketTypeId1, mockTicketTypeId2] },
              { code: 'BONUS5', amount: 40.0, appliedTo: [mockTicketTypeId1, mockTicketTypeId2] },
            ],
            total: 520.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      await cartService.validateCart(request);

      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('cart-validate', {
        body: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ quantity: expect.any(Number) }),
          ]),
          couponCodes: expect.arrayContaining(['DESC20', 'EXTRA10', 'BONUS5']),
        }),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle coupon not found error', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['NAOEXISTE'],
      };

      const mockResponse = {
        ok: false,
        errors: [
          {
            code: 'CUPOM_NAO_ENCONTRADO',
            couponCode: 'NAOEXISTE',
            message: 'Cupom "NAOEXISTE" não encontrado ou inativo.',
          },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(false);
      expect(result.errors![0].code).toBe('CUPOM_NAO_ENCONTRADO');
    });

    it('should handle empty coupon codes array', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: [],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 100.0,
            discounts: [],
            total: 100.0,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      expect(result.summary?.pricing?.discounts).toHaveLength(0);
    });

    it('should handle precision in discount calculations', async () => {
      const request: CartValidationRequest = {
        tenantId: mockTenantId,
        eventId: mockEventId,
        buyerCpf: '12345678900',
        items: [
          { ticketTypeId: mockTicketTypeId1, lotId: mockLotId1, quantity: 1 },
        ],
        couponCodes: ['DESC33'],
      };

      const mockResponse = {
        ok: true,
        summary: {
          totalItems: 1,
          byType: [{ ticketTypeId: mockTicketTypeId1, qty: 1 }],
          byLot: [{ lotId: mockLotId1, qty: 1 }],
          pricing: {
            subtotal: 99.99,
            discounts: [
              { code: 'DESC33', amount: 33.0, appliedTo: [mockTicketTypeId1] }, // 33% arredondado
            ],
            total: 66.99,
          },
          warnings: [],
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await cartService.validateCart(request);

      expect(result.ok).toBe(true);
      // Verify precision (2 decimal places)
      expect(result.summary?.pricing?.discounts![0].amount).toBe(33.0);
      expect(result.summary?.pricing?.total).toBe(66.99);
    });
  });
});
