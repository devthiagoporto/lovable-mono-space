import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/services/auth';
import * as supabaseModule from '@/integrations/supabase/client';
import {
  createMockSupabaseClient,
  mockSession,
  mockAdminMemberships,
} from '../mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

describe('Auth Service', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = (supabaseModule as any).supabase;
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('deve fazer login com sucesso e retornar session', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          session: mockSession,
          user: mockSession.user,
        },
        error: null,
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.session).toEqual(mockSession);
      expect(result.user).toEqual(mockSession.user);
    });

    it('deve retornar erro quando credenciais são inválidas', async () => {
      const mockError = new Error('Invalid login credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: mockError,
      });

      await expect(
        authService.signIn('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid login credentials');
    });
  });

  describe('signOut', () => {
    it('deve fazer logout com sucesso', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      await authService.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('deve propagar erro se logout falhar', async () => {
      const mockError = new Error('Logout failed');
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: mockError,
      });

      await expect(authService.signOut()).rejects.toThrow('Logout failed');
    });
  });

  describe('fetchMe', () => {
    it('deve retornar user e memberships do tenant atual', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockSession.user },
        error: null,
      });

      const mockFromChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: mockAdminMemberships,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

      const result = await authService.fetchMe();

      expect(result).toEqual({
        user: {
          id: mockSession.user.id,
          email: mockSession.user.email,
        },
        memberships: [
          {
            tenantId: 'tenant-a',
            tenantName: 'Tenant A',
            role: 'organizer_admin',
          },
        ],
      });
    });

    it('deve retornar null quando usuário não está autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await authService.fetchMe();

      expect(result).toBeNull();
    });

    it('deve propagar erro quando query de roles falhar', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockSession.user },
        error: null,
      });

      const mockError = new Error('Database error');
      const mockFromChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: mockError,
          })),
        })),
      };

      mockSupabase.from.mockReturnValueOnce(mockFromChain as any);

      await expect(authService.fetchMe()).rejects.toThrow('Database error');
    });
  });
});
