import { createClient } from '@supabase/supabase-js';
import { env } from '../env';
import { secureStorage } from '../storage/secure-storage';

if (__DEV__) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  console.log('[SUPABASE URL]', url);
  console.log('[SUPABASE KEY EXISTS]', !!key);
}

/**
 * Supabase client used for:
 *  - auth (email/password, magic link, OAuth)
 *  - realtime subscriptions (notifications, workout sessions)
 *  - storage (progress photos)
 *
 * Mutating coaching flows go through the NestJS backend instead of direct table writes.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
