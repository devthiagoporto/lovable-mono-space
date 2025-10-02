import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import * as supabaseModule from '@/integrations/supabase/client';
import {
  createMockSupabaseClient,
  mockOperatorSession,
  mockBuyerSession,
  mockOperatorMemberships,
  mockBuyerMemberships,
} from '../mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;
const LoginComponent = () => <div>Login Page</div>;

describe('ProtectedRoute - Guards', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = (supabaseModule as any).supabase;
    vi.clearAllMocks();
  });

  describe('withAuth - Guard de autenticação', () => {
    it('deve redirecionar usuário anônimo para /login', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementationOnce((callback) => {
        callback('SIGNED_OUT', null);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginComponent />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <TestComponent text="Dashboard" />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });
    });

    it('deve permitir acesso quando usuário está autenticado', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockOperatorSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementationOnce((callback) => {
        callback('SIGNED_IN', mockOperatorSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const mockFromChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: mockOperatorMemberships,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue(mockFromChain as any);

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginComponent />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <TestComponent text="Dashboard" />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('withRole - Guard de permissão', () => {
    it('deve permitir acesso a /checkin para checkin_operator', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockOperatorSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementationOnce((callback) => {
        callback('SIGNED_IN', mockOperatorSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const mockFromChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: mockOperatorMemberships,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue(mockFromChain as any);

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginComponent />} />
              <Route
                path="/checkin"
                element={
                  <ProtectedRoute requiredRole="checkin_operator">
                    <TestComponent text="Check-in Portal OK" />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Check-in Portal OK')).toBeInTheDocument();
      });
    });

    it('deve bloquear acesso a /checkin para buyer (espera 403)', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockBuyerSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementationOnce((callback) => {
        callback('SIGNED_IN', mockBuyerSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const mockFromChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: mockBuyerMemberships,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue(mockFromChain as any);

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginComponent />} />
              <Route
                path="/checkin"
                element={
                  <ProtectedRoute requiredRole="checkin_operator">
                    <TestComponent text="Check-in Portal OK" />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Acesso Negado')).toBeInTheDocument();
        expect(screen.queryByText('Check-in Portal OK')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('deve mostrar loading enquanto verifica autenticação', async () => {
      mockSupabase.auth.getSession.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { session: mockOperatorSession },
                  error: null,
                }),
              100
            )
          )
      );

      mockSupabase.auth.onAuthStateChange.mockImplementationOnce(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }));

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <TestComponent text="Dashboard" />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('Carregando...')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });
  });
});
