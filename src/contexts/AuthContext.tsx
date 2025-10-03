import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserMembership {
  tenantId: string;
  tenantName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  memberships: UserMembership[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchMemberships = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          tenant_id,
          role,
          tenants (
            nome
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const membershipList = (data || []).map((item: any) => ({
        tenantId: item.tenant_id,
        tenantName: item.tenants?.nome || 'Unknown',
        role: item.role,
      }));

      setMemberships(membershipList);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setMemberships([]);
    }
  };

  const refreshMemberships = async () => {
    if (user) {
      await fetchMemberships(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchMemberships(currentSession.user.id);
          
          // Only redirect on SIGNED_IN event (not on initial load)
          if (event === 'SIGNED_IN' && !initialLoad) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', currentSession.user.id);
            
            const hasCheckinRole = roles?.some((r: any) => r.role === 'checkin_operator');
            
            if (window.location.pathname === '/login' || window.location.pathname === '/checkin') {
              if (hasCheckinRole) {
                navigate('/checkin');
              } else {
                navigate('/dashboard');
              }
            }
          }
        } else {
          setMemberships([]);
        }
        
        setLoading(false);
        if (initialLoad) setInitialLoad(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await fetchMemberships(currentSession.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, initialLoad]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name,
          },
        },
      });

      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMemberships([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        memberships,
        loading,
        signIn,
        signUp,
        signOut,
        refreshMemberships,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
