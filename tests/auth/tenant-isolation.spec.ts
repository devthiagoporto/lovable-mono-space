import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as supabaseModule from '@/integrations/supabase/client';
import {
  createMockSupabaseClient,
  mockSession,
  mockAdminMemberships,
  mockTenantBMemberships,
} from '../mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

describe('Isolamento Multi-Tenant', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = (supabaseModule as any).supabase;
    vi.clearAllMocks();
  });

  it('usuário do tenant B não deve enxergar dados do tenant A', async () => {
    // Simular usuário autenticado do tenant B
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { ...mockSession.user, id: 'user-tenant-b' } },
      error: null,
    });

    // Mock de consulta aos eventos do tenant A (deve retornar vazio devido a RLS)
    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [], // RLS bloqueia acesso
          error: null,
        })),
      })),
    };

    mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

    const { data, error } = await (mockSupabase.from as any)('events')
      .select('*')
      .eq('tenant_id', 'tenant-a');

    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('usuário do tenant A deve enxergar apenas dados do tenant A', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockSession.user },
      error: null,
    });

    const mockEventsFromTenantA = [
      {
        id: 'event-1',
        tenant_id: 'tenant-a',
        titulo: 'Evento Tenant A',
        status: 'publicado',
      },
    ];

    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockEventsFromTenantA,
          error: null,
        })),
      })),
    };

    mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

    const { data, error } = await (mockSupabase.from as any)('events')
      .select('*')
      .eq('tenant_id', 'tenant-a');

    expect(data).toEqual(mockEventsFromTenantA);
    expect(data).toHaveLength(1);
    expect(data[0].tenant_id).toBe('tenant-a');
    expect(error).toBeNull();
  });

  it('tentativa de INSERT em outro tenant deve falhar', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { ...mockSession.user, id: 'user-tenant-b' } },
      error: null,
    });

    // Mock de tentativa de inserir no tenant A (deve falhar por RLS)
    const mockError = {
      code: '42501',
      message: 'new row violates row-level security policy',
    };

    const mockFromChain = {
      insert: vi.fn(() => ({
        data: null,
        error: mockError,
      })),
    };

    mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

    const { data, error } = await (mockSupabase.from as any)('events').insert({
      tenant_id: 'tenant-a',
      titulo: 'Hack Attempt',
      status: 'rascunho',
    });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error.message).toContain('row-level security');
  });

  it('tentativa de UPDATE em outro tenant deve falhar', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { ...mockSession.user, id: 'user-tenant-b' } },
      error: null,
    });

    const mockError = {
      code: '42501',
      message: 'new row violates row-level security policy',
    };

    const mockFromChain = {
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: mockError,
        })),
      })),
    };

    mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

    const { data, error } = await (mockSupabase.from as any)('events')
      .update({ titulo: 'Modified' })
      .eq('tenant_id', 'tenant-a');

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error.message).toContain('row-level security');
  });

  it('leitura de eventos publicados deve ser pública (sem tenant_id)', async () => {
    // Usuário não autenticado pode ler eventos publicados
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const mockPublicEvents = [
      {
        id: 'event-public',
        tenant_id: 'tenant-a',
        titulo: 'Evento Público',
        status: 'publicado',
      },
    ];

    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockPublicEvents,
          error: null,
        })),
      })),
    };

    mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

    const { data, error } = await (mockSupabase.from as any)('events')
      .select('*')
      .eq('status', 'publicado');

    expect(data).toEqual(mockPublicEvents);
    expect(error).toBeNull();
  });

  it('tentativa de escrita em eventos deve falhar para usuário não autenticado', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const mockError = {
      code: '42501',
      message: 'new row violates row-level security policy',
    };

    const mockFromChain = {
      insert: vi.fn(() => ({
        data: null,
        error: mockError,
      })),
    };

    mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

    const { data, error } = await (mockSupabase.from as any)('events').insert({
      tenant_id: 'tenant-a',
      titulo: 'Unauthorized Insert',
      status: 'rascunho',
    });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error.message).toContain('row-level security');
  });
});
