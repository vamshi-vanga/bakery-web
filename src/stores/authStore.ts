import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Bakery, BakeryMembership } from '@/types/database';
import { syncSecurityLedgerWithServer } from '@/services/securityService';
import { purgeAllLocalOfflineData } from '@/services/offlineStorage';

const CACHED_BAKERY_KEY = '@bakeflow_cached_bakery_profile';
const CACHED_MEMBERSHIP_KEY = '@bakeflow_cached_membership_profile';

interface AuthState {
  user: User | null;
  session: Session | null;
  currentBakery: Bakery | null;
  currentMembership: BakeryMembership | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUserSession: (session: Session | null) => Promise<void>;
  fetchBakeryProfile: () => Promise<Bakery | null>;
  setBakery: (bakery: Bakery, membership: BakeryMembership) => void;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  currentBakery: null,
  currentMembership: null,
  isLoading: true,
  isInitialized: false,

  setUserSession: async (session: Session | null) => {
    const user = session?.user ?? null;
    set({ session, user, isLoading: true });

    if (!user) {
      set({
        currentBakery: null,
        currentMembership: null,
        isLoading: false,
        isInitialized: true,
      });
      return;
    }

    try {
      // Race with 5s timeout so network hiccups never lock the app in loading state
      await Promise.race([
        get().fetchBakeryProfile(),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch (err) {
      console.warn('fetchBakeryProfile timeout or error:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  fetchBakeryProfile: async () => {
    try {
      const user = get().user;
      if (!user) {
        set({ currentBakery: null, currentMembership: null });
        return null;
      }

      // 1. Fetch user's bakery membership
      const { data: memberships, error: memError } = await supabase
        .from('bakery_memberships')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (memError || !memberships || memberships.length === 0) {
        set({ currentBakery: null, currentMembership: null });
        return null;
      }

      const membership = memberships[0] as BakeryMembership;

      // 2. Fetch the corresponding bakery record
      const { data: bakeryData, error: bakError } = await supabase
        .from('bakeries')
        .select('*')
        .eq('id', membership.bakery_id)
        .single();

      if (bakError || !bakeryData) {
        set({ currentBakery: null, currentMembership: membership });
        return null;
      }

      const bakery = bakeryData as Bakery;
      set({ currentBakery: bakery, currentMembership: membership });

      // Cache locally for offline availability and sync tamper-proof ledger
      try {
        await AsyncStorage.setItem(CACHED_BAKERY_KEY, JSON.stringify(bakery));
        await AsyncStorage.setItem(CACHED_MEMBERSHIP_KEY, JSON.stringify(membership));
        await syncSecurityLedgerWithServer(bakery);
      } catch (cacheErr) {
        console.warn('Failed to cache bakery or sync security ledger:', cacheErr);
      }

      return bakery;
    } catch (error) {
      console.warn('Network issue fetching bakery profile, attempting local offline cache:', error);
      try {
        const [cachedBak, cachedMem] = await Promise.all([
          AsyncStorage.getItem(CACHED_BAKERY_KEY),
          AsyncStorage.getItem(CACHED_MEMBERSHIP_KEY),
        ]);
        if (cachedBak && cachedMem) {
          const bakery = JSON.parse(cachedBak) as Bakery;
          const membership = JSON.parse(cachedMem) as BakeryMembership;
          set({ currentBakery: bakery, currentMembership: membership });
          return bakery;
        }
      } catch (offlineErr) {
        console.error('Failed to read cached offline bakery:', offlineErr);
      }

      set({ currentBakery: null, currentMembership: null });
      return null;
    }
  },

  setBakery: (bakery: Bakery, membership: BakeryMembership) => {
    set({ currentBakery: bakery, currentMembership: membership });
    AsyncStorage.setItem(CACHED_BAKERY_KEY, JSON.stringify(bakery)).catch(() => {});
    AsyncStorage.setItem(CACHED_MEMBERSHIP_KEY, JSON.stringify(membership)).catch(() => {});
    syncSecurityLedgerWithServer(bakery).catch(() => {});
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove([CACHED_BAKERY_KEY, CACHED_MEMBERSHIP_KEY]);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      set({
        user: null,
        session: null,
        currentBakery: null,
        currentMembership: null,
        isLoading: false,
      });
    }
  },

  deleteAccount: async (password: string): Promise<{ success: boolean; error?: string }> => {
    const user = get().user;
    if (!user || !user.email) {
      return { success: false, error: 'User session not found.' };
    }

    try {
      // 1. Password verification by attempting sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (verifyError) {
        return {
          success: false,
          error: 'Incorrect password. Please verify your current password and try again.',
        };
      }

      // 2. Call delete_user_account RPC
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) {
        console.error('delete_user_account RPC error:', rpcError);
        return {
          success: false,
          error: rpcError.message || 'Server failed to process account deletion.',
        };
      }

      // 3. Purge all offline SQLite data & Async Storage
      try {
        await purgeAllLocalOfflineData();
      } catch (dbErr) {
        console.warn('Failed to purge local SQLite:', dbErr);
      }

      try {
        await AsyncStorage.clear();
      } catch (storeErr) {
        console.warn('Failed to clear AsyncStorage:', storeErr);
      }

      // 4. Sign out
      await supabase.auth.signOut().catch(() => {});

      // 5. Reset auth store
      set({
        user: null,
        session: null,
        currentBakery: null,
        currentMembership: null,
        isLoading: false,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Account deletion error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during account deletion.',
      };
    }
  },
}));
