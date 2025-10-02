import { vi } from 'vitest';

// Mock session data
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  },
};

export const mockAdminSession = {
  ...mockSession,
  user: {
    ...mockSession.user,
    id: 'admin-user-id',
    email: 'admin@example.com',
  },
};

export const mockOperatorSession = {
  ...mockSession,
  user: {
    ...mockSession.user,
    id: 'operator-user-id',
    email: 'operator@example.com',
  },
};

export const mockBuyerSession = {
  ...mockSession,
  user: {
    ...mockSession.user,
    id: 'buyer-user-id',
    email: 'buyer@example.com',
  },
};

// Mock memberships
export const mockAdminMemberships = [
  {
    tenant_id: 'tenant-a',
    role: 'organizer_admin',
    tenants: { nome: 'Tenant A' },
  },
];

export const mockOperatorMemberships = [
  {
    tenant_id: 'tenant-a',
    role: 'checkin_operator',
    tenants: { nome: 'Tenant A' },
  },
];

export const mockBuyerMemberships = [
  {
    tenant_id: 'tenant-a',
    role: 'buyer',
    tenants: { nome: 'Tenant A' },
  },
];

export const mockTenantBMemberships = [
  {
    tenant_id: 'tenant-b',
    role: 'buyer',
    tenants: { nome: 'Tenant B' },
  },
];

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
      in: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      data: null,
      error: null,
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  }));

  const mockFunctions = {
    invoke: vi.fn(),
  };

  return {
    auth: mockAuth,
    from: mockFrom,
    functions: mockFunctions,
  };
};

// Mock responses for Edge Functions
export const mockOperatorCreateSuccess = {
  data: {
    userId: 'new-operator-id',
    tempPassword: 'Check12345678!',
  },
  error: null,
};

export const mockOperatorCreate401 = {
  data: null,
  error: {
    message: 'Missing authorization header',
    status: 401,
  },
};

export const mockOperatorCreate403 = {
  data: null,
  error: {
    message: 'Insufficient permissions',
    status: 403,
  },
};

export const mockRoleAssignSuccess = {
  data: { success: true },
  error: null,
};

export const mockRoleAssign400 = {
  data: null,
  error: {
    message: 'Invalid role. Allowed: organizer_staff, checkin_operator, buyer',
    status: 400,
  },
};
