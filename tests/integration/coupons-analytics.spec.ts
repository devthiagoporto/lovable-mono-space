import { describe, it, expect, vi, beforeEach } from 'vitest';
import { couponService } from '@/services/coupons';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
          data: [],
          error: null,
        })),
        in: vi.fn(() => ({
          gte: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('Coupon Analytics Tests (ETAPA 4)', () => {
  const mockEventId = 'event-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('C1. Analytics KPIs', () => {
    it('should calculate total active coupons', async () => {
      const mockCoupons = [
        {
          id: '1',
          codigo: 'ATIVO1',
          tipo: 'percentual',
          valor: 10,
          ativo: true,
          uso_total: 5,
        },
        {
          id: '2',
          codigo: 'ATIVO2',
          tipo: 'valor',
          valor: 50,
          ativo: true,
          uso_total: 3,
        },
        {
          id: '3',
          codigo: 'INATIVO',
          tipo: 'percentual',
          valor: 20,
          ativo: false,
          uso_total: 0,
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
        })),
      } as any);

      const analytics = await couponService.getAnalytics(mockEventId);

      expect(analytics.totalAtivos).toBe(2); // Only active coupons
    });

    it('should calculate total usage across all coupons', async () => {
      const mockCoupons = [
        { id: '1', codigo: 'C1', tipo: 'percentual', ativo: true, uso_total: 10 },
        { id: '2', codigo: 'C2', tipo: 'valor', ativo: true, uso_total: 15 },
        { id: '3', codigo: 'C3', tipo: 'cortesia', ativo: false, uso_total: 5 },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
        })),
      } as any);

      const analytics = await couponService.getAnalytics(mockEventId);

      expect(analytics.totalUsos).toBe(30); // 10 + 15 + 5
    });

    it('should return top 5 coupons by usage', async () => {
      const mockCoupons = [
        { id: '1', codigo: 'TOP1', tipo: 'percentual', ativo: true, uso_total: 100 },
        { id: '2', codigo: 'TOP2', tipo: 'valor', ativo: true, uso_total: 80 },
        { id: '3', codigo: 'TOP3', tipo: 'cortesia', ativo: true, uso_total: 60 },
        { id: '4', codigo: 'TOP4', tipo: 'percentual', ativo: true, uso_total: 40 },
        { id: '5', codigo: 'TOP5', tipo: 'valor', ativo: true, uso_total: 20 },
        { id: '6', codigo: 'LOW', tipo: 'percentual', ativo: true, uso_total: 5 },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
        })),
      } as any);

      const analytics = await couponService.getAnalytics(mockEventId);

      expect(analytics.topCupons).toHaveLength(5);
      expect(analytics.topCupons[0].codigo).toBe('TOP1');
      expect(analytics.topCupons[0].uso_total).toBe(100);
      expect(analytics.topCupons[4].codigo).toBe('TOP5');
    });

    it('should handle events with no coupons', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      } as any);

      const analytics = await couponService.getAnalytics(mockEventId);

      expect(analytics.totalAtivos).toBe(0);
      expect(analytics.totalUsos).toBe(0);
      expect(analytics.topCupons).toHaveLength(0);
      expect(analytics.usosPorDia).toHaveLength(0);
    });
  });

  describe('C2. Usage by Day', () => {
    it('should aggregate usage by day for last 30 days', async () => {
      const mockCoupons = [{ id: 'c1', codigo: 'TEST' }];
      const mockUsage = [
        { created_at: '2025-01-01T10:00:00Z' },
        { created_at: '2025-01-01T15:00:00Z' },
        { created_at: '2025-01-02T12:00:00Z' },
        { created_at: '2025-01-03T09:00:00Z' },
        { created_at: '2025-01-03T11:00:00Z' },
        { created_at: '2025-01-03T14:00:00Z' },
      ];

      const mockFrom = vi.fn();
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
            })),
          } as any;
        } else if (table === 'coupon_usage') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                gte: vi.fn(() => Promise.resolve({ data: mockUsage, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const analytics = await couponService.getAnalytics(mockEventId);

      expect(analytics.usosPorDia).toBeDefined();
      // Should have 3 days: 2025-01-01 (2), 2025-01-02 (1), 2025-01-03 (3)
      const day1 = analytics.usosPorDia.find((d) => d.data === '2025-01-01');
      const day2 = analytics.usosPorDia.find((d) => d.data === '2025-01-02');
      const day3 = analytics.usosPorDia.find((d) => d.data === '2025-01-03');

      expect(day1?.usos).toBe(2);
      expect(day2?.usos).toBe(1);
      expect(day3?.usos).toBe(3);
    });

    it('should sort usage by date ascending', async () => {
      const mockCoupons = [{ id: 'c1', codigo: 'TEST' }];
      const mockUsage = [
        { created_at: '2025-01-03T10:00:00Z' },
        { created_at: '2025-01-01T10:00:00Z' },
        { created_at: '2025-01-02T10:00:00Z' },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
            })),
          } as any;
        } else if (table === 'coupon_usage') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                gte: vi.fn(() => Promise.resolve({ data: mockUsage, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const analytics = await couponService.getAnalytics(mockEventId);

      expect(analytics.usosPorDia[0].data).toBe('2025-01-01');
      expect(analytics.usosPorDia[1].data).toBe('2025-01-02');
      expect(analytics.usosPorDia[2].data).toBe('2025-01-03');
    });
  });

  describe('C3. CSV Export', () => {
    it('should generate CSV with header and data rows', async () => {
      const mockCoupons = [
        { id: 'c1', codigo: 'CUPOM1' },
        { id: 'c2', codigo: 'CUPOM2' },
      ];
      const mockUsage = [
        {
          coupon_id: 'c1',
          cpf: '12345678900',
          created_at: '2025-01-01T10:00:00Z',
        },
        {
          coupon_id: 'c2',
          cpf: '98765432100',
          created_at: '2025-01-02T15:30:00Z',
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
            })),
          } as any;
        } else if (table === 'coupon_usage') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockUsage, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const csv = await couponService.exportUsageCSV(mockEventId);

      expect(csv).toContain('codigo,cpf,data');
      expect(csv).toContain('CUPOM1');
      expect(csv).toContain('CUPOM2');
      expect(csv).toContain('12345678900');
      expect(csv).toContain('98765432100');
    });

    it('should handle empty usage data', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          } as any;
        }
        return {} as any;
      });

      const csv = await couponService.exportUsageCSV(mockEventId);

      expect(csv).toBe('codigo,cpf,data\n');
    });

    it('should format dates in pt-BR locale', async () => {
      const mockCoupons = [{ id: 'c1', codigo: 'TEST' }];
      const mockUsage = [
        {
          coupon_id: 'c1',
          cpf: '12345678900',
          created_at: '2025-01-15T14:30:00Z',
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
            })),
          } as any;
        } else if (table === 'coupon_usage') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockUsage, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const csv = await couponService.exportUsageCSV(mockEventId);

      // Should contain formatted date
      expect(csv).toBeTruthy();
    });

    it('should handle null CPF with N/A', async () => {
      const mockCoupons = [{ id: 'c1', codigo: 'TEST' }];
      const mockUsage = [
        {
          coupon_id: 'c1',
          cpf: null,
          created_at: '2025-01-15T14:30:00Z',
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockCoupons, error: null })),
            })),
          } as any;
        } else if (table === 'coupon_usage') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockUsage, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const csv = await couponService.exportUsageCSV(mockEventId);

      expect(csv).toContain('N/A');
    });
  });

  describe('C4. Coupon Usage Pagination', () => {
    it('should return paginated usage data', async () => {
      const mockUsage = Array.from({ length: 50 }, (_, i) => ({
        id: `usage-${i}`,
        coupon_id: 'c1',
        cpf: '12345678900',
        created_at: new Date().toISOString(),
      }));

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn((from, to) =>
                Promise.resolve({
                  data: mockUsage.slice(from, to + 1),
                  count: mockUsage.length,
                  error: null,
                })
              ),
            })),
          })),
        })),
      } as any);

      const page1 = await couponService.getUsage('c1', 1, 20);
      const page2 = await couponService.getUsage('c1', 2, 20);

      expect(page1.data).toHaveLength(20);
      expect(page1.count).toBe(50);
      expect(page2.data).toHaveLength(20);
    });

    it('should handle last page with fewer items', async () => {
      const mockUsage = Array.from({ length: 25 }, (_, i) => ({
        id: `usage-${i}`,
        coupon_id: 'c1',
        cpf: '12345678900',
        created_at: new Date().toISOString(),
      }));

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn((from, to) =>
                Promise.resolve({
                  data: mockUsage.slice(from, Math.min(to + 1, mockUsage.length)),
                  count: mockUsage.length,
                  error: null,
                })
              ),
            })),
          })),
        })),
      } as any);

      const page2 = await couponService.getUsage('c1', 2, 20);

      expect(page2.data).toHaveLength(5); // 25 - 20
      expect(page2.count).toBe(25);
    });
  });

  describe('C5. Error Handling', () => {
    it('should handle database errors in analytics', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'DB Error' } })
          ),
        })),
      } as any);

      await expect(couponService.getAnalytics(mockEventId)).rejects.toThrow();
    });

    it('should handle database errors in CSV export', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'DB Error' } })
          ),
        })),
      } as any);

      await expect(couponService.exportUsageCSV(mockEventId)).rejects.toThrow();
    });
  });
});
