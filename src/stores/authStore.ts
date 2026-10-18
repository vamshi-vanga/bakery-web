import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Bakery, BakeryMembership } from '@/types/database';

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
      return bakery;
    } catch (error) {
      console.error('Error fetching bakery profile:', error);
      set({ currentBakery: null, currentMembership: null });
      return null;
    }
  },

  setBakery: (bakery: Bakery, membership: BakeryMembership) => {
    set({ currentBakery: bakery, currentMembership: membership });
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
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
}));
