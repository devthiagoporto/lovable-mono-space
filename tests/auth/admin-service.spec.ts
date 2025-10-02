import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '@/services/admin';
import * as supabaseModule from '@/integrations/supabase/client';
import {
  createMockSupabaseClient,
  mockOperatorCreateSuccess,
  mockOperatorCreate401,
  mockOperatorCreate403,
  mockRoleAssignSuccess,
  mockRoleAssign400,
} from '../mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

describe('Admin Service', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = (supabaseModule as any).supabase;
    vi.clearAllMocks();
  });

  describe('createOperator', () => {
    const validRequest = {
      email: 'operator@example.com',
      nome: 'Operador Teste',
      tenantId: 'tenant-a',
    };

    it('deve criar operador com sucesso quando usuário é organizer_admin', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce(mockOperatorCreateSuccess);

      const result = await adminService.createOperator(validRequest);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('operators-create', {
        body: validRequest,
      });
      expect(result).toEqual({
        userId: 'new-operator-id',
        tempPassword: 'Check12345678!',
      });
    });

    it('deve retornar erro 401 quando não há token de autenticação', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce(mockOperatorCreate401);

      await expect(adminService.createOperator(validRequest)).rejects.toThrow();
    });

    it('deve retornar erro 403 quando usuário não tem permissão', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce(mockOperatorCreate403);

      await expect(adminService.createOperator(validRequest)).rejects.toThrow();
    });

    it('deve validar campos obrigatórios', async () => {
      const invalidRequest = {
        email: '',
        nome: 'Teste',
        tenantId: 'tenant-a',
      };

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Missing required fields: email, nome, tenantId',
          status: 400,
        },
      });

      await expect(adminService.createOperator(invalidRequest as any)).rejects.toThrow();
    });
  });

  describe('assignRole', () => {
    const validRequest = {
      userId: 'user-123',
      tenantId: 'tenant-a',
      role: 'organizer_staff' as const,
    };

    it('deve atribuir role com sucesso', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce(mockRoleAssignSuccess);

      await adminService.assignRole(validRequest);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('roles-assign', {
        body: validRequest,
      });
    });

    it('deve rejeitar role admin_saas via API', async () => {
      const invalidRequest = {
        userId: 'user-123',
        tenantId: 'tenant-a',
        role: 'admin_saas' as any,
      };

      mockSupabase.functions.invoke.mockResolvedValueOnce(mockRoleAssign400);

      await expect(adminService.assignRole(invalidRequest)).rejects.toThrow();
    });

    it('deve rejeitar roles inválidas', async () => {
      const invalidRequest = {
        userId: 'user-123',
        tenantId: 'tenant-a',
        role: 'super_user' as any,
      };

      mockSupabase.functions.invoke.mockResolvedValueOnce(mockRoleAssign400);

      await expect(adminService.assignRole(invalidRequest)).rejects.toThrow();
    });

    it('deve permitir roles válidas (organizer_staff, checkin_operator, buyer)', async () => {
      const roles = ['organizer_staff', 'checkin_operator', 'buyer'] as const;

      for (const role of roles) {
        mockSupabase.functions.invoke.mockResolvedValueOnce(mockRoleAssignSuccess);

        await adminService.assignRole({
          userId: 'user-123',
          tenantId: 'tenant-a',
          role,
        });

        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('roles-assign', {
          body: {
            userId: 'user-123',
            tenantId: 'tenant-a',
            role,
          },
        });
      }
    });
  });
});
