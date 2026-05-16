import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import { mmkv } from '../lib/storage/mmkv';
import { supabase } from '../lib/supabase/client';
import { logAuthGateTiming } from '../lib/auth/auth-gate-timing';
import { logger } from '../lib/logging/logger';

const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => mmkv.delete(name),
};

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly session: Session | null;
  readonly error: string | null;
  /** User id that completed onboarding on this device; null = never completed. */
  readonly onboardedUserId: string | null;
  hydrate: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  markOnboarded: () => void;
}

let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

/** True when the current Supabase user has completed onboarding on this device. */
export function hasCompletedOnboardingForCurrentUser(s: AuthState): boolean {
  const id = s.user?.id;
  if (!id) return false;
  return s.onboardedUserId === id;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      user: null,
      session: null,
      error: null,
      onboardedUserId: null,

      hydrate: async () => {
        const startedAt = Date.now();
        logAuthGateTiming('session:hydrate-start');
        set({ status: 'loading' });
        try {
          const { data } = await supabase.auth.getSession();
          const nextStatus = data.session ? 'authenticated' : 'unauthenticated';
          set({
            status: nextStatus,
            session: data.session,
            user: data.session?.user ?? null,
            error: null,
          });
          logAuthGateTiming('session:hydrate-done', {
            status: nextStatus,
            durationMs: Date.now() - startedAt,
            hasUser: !!data.session?.user,
          });
          if (!authSubscription) {
            authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
              set({
                session,
                user: session?.user ?? null,
                status: session ? 'authenticated' : 'unauthenticated',
              });
            }).data.subscription;
          }
        } catch (error) {
          logger.error('Auth hydrate failed', error);
          set({ status: 'unauthenticated', error: 'Failed to load session' });
        }
      },

      signInWithPassword: async (email, password) => {
        set({ status: 'loading', error: null });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          set({ status: 'unauthenticated', error: error.message });
          throw error;
        }
        set({ session: data.session, user: data.user, status: 'authenticated' });
      },

      signUpWithPassword: async (email, password) => {
        set({ status: 'loading', error: null });
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          set({ status: 'unauthenticated', error: error.message });
          throw error;
        }
        set({
          session: data.session,
          user: data.user,
          status: data.session ? 'authenticated' : 'unauthenticated',
        });
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, status: 'unauthenticated' });
      },

      markOnboarded: () => {
        const userId = get().user?.id;
        if (!userId || get().onboardedUserId === userId) return;
        set({ onboardedUserId: userId });
      },
    }),
    {
      name: 'schede.auth.onboarding.v1',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({ onboardedUserId: s.onboardedUserId }),
    },
  ),
);
