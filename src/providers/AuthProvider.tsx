import React, { createContext, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface AuthContextType {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  session: ReturnType<typeof useAuthStore.getState>['session'];
  currentBakery: ReturnType<typeof useAuthStore.getState>['currentBakery'];
  currentMembership: ReturnType<typeof useAuthStore.getState>['currentMembership'];
  isLoading: boolean;
  isInitialized: boolean;
  refreshBakeryProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    session,
    currentBakery,
    currentMembership,
    isLoading,
    isInitialized,
    setUserSession,
    fetchBakeryProfile,
    signOut,
  } = useAuthStore();

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setUserSession(initialSession);
    });

    // 2. Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setUserSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUserSession]);

  const refreshBakeryProfile = async () => {
    await fetchBakeryProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        currentBakery,
        currentMembership,
        isLoading,
        isInitialized,
        refreshBakeryProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
