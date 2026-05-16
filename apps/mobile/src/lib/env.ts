import Constants from 'expo-constants';
import { getExpoGoProjectConfig } from 'expo';
import { NativeModules } from 'react-native';
import { z } from 'zod';

const FORBIDDEN_CLIENT_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'EXPO_PUBLIC_SERVICE_ROLE_KEY',
] as const;

export interface AppEnv {
  readonly apiBaseUrl: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

export class MobileEnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MobileEnvValidationError';
  }
}

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `  • ${path}: ${issue.message}`;
  });
  return ['Invalid public environment configuration:', ...lines, '', 'See apps/mobile/.env.example and ENV_SETUP.md at the repo root.'].join('\n');
}

function assertNoServiceRoleInClientBundle(): void {
  for (const key of FORBIDDEN_CLIENT_ENV_KEYS) {
    const v = process.env[key];
    if (v != null && String(v).trim() !== '') {
      throw new MobileEnvValidationError(
        `Forbidden environment key: ${key}\n\nThe Supabase **service_role** key must never be prefixed with EXPO_PUBLIC_ or shipped in the mobile bundle.\nUse EXPO_PUBLIC_SUPABASE_ANON_KEY only. See ENV_SETUP.md.`,
      );
    }
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

/** Metro / Expo dev server host (LAN), for replacing localhost in API base URL. */
function getDevPackagerLanHost(): string | undefined {
  const dbg = getExpoGoProjectConfig()?.debuggerHost;
  if (typeof dbg === 'string' && dbg.length > 0) {
    const host = dbg.split(':')[0]?.trim();
    if (host && !isLoopbackHostname(host)) return host;
  }
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL) return undefined;
    const afterProto = scriptURL.split('://')[1];
    const hostPort = afterProto?.split('/')?.[0];
    if (!hostPort) return undefined;
    const host = hostPort.split(':')[0]?.trim();
    if (host && !isLoopbackHostname(host)) return host;
  } catch {
    /* ignore */
  }
  return undefined;
}

function readOptionalApiPort(): number | undefined {
  const raw = process.env.EXPO_PUBLIC_API_PORT;
  if (raw == null || String(raw).trim() === '') return undefined;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n >= 1 && n <= 65_535 ? n : undefined;
}

/**
 * In __DEV__, replace loopback API host with the LAN IP of the machine running Metro
 * (Expo Go on a physical device cannot reach "localhost" on the phone).
 */
function applyDevLanFallbackToApiBaseUrl(raw: unknown): unknown {
  if (!__DEV__) return raw;
  if (process.env.EXPO_PUBLIC_DISABLE_LAN_API_FALLBACK === '1') return raw;
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (trimmed === '') return raw;

  const lan = getDevPackagerLanHost();
  if (!lan) return raw;

  if (!/^https?:\/\//i.test(trimmed)) return raw;

  try {
    const u = new URL(trimmed);
    if (!isLoopbackHostname(u.hostname)) return trimmed.replace(/\/+$/, '');
    const port = u.port || String(readOptionalApiPort() ?? 3000);
    const protocol = u.protocol || 'http:';
    return `${protocol}//${lan}:${port}`.replace(/\/+$/, '');
  } catch {
    return raw;
  }
}

function readRawFromProcessAndExtra(): Record<string, unknown> {
  assertNoServiceRoleInClientBundle();
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const rawApi =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    extra.apiBaseUrl;
  const lanHost = getDevPackagerLanHost();
  const port = readOptionalApiPort() ?? 3000;
  let apiBaseUrl: unknown =
    typeof rawApi === 'string' && rawApi.trim() !== ''
      ? applyDevLanFallbackToApiBaseUrl(rawApi)
      : rawApi;
  if (__DEV__ && lanHost && (apiBaseUrl == null || String(apiBaseUrl).trim() === '')) {
    apiBaseUrl = `http://${lanHost}:${port}`;
  }
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return { apiBaseUrl, supabaseUrl, supabaseAnonKey };
}

const mobilePublicEnvSchema = z.object({
  apiBaseUrl: z
    .string({ required_error: 'Missing API URL (EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_API_URL, or app.json extra.apiBaseUrl)' })
    .transform((s) => s.trim().replace(/\/+$/, ''))
    .refine((s) => /^https?:\/\//i.test(s), {
      message: 'API base URL must start with http:// or https://',
    })
    .refine((s) => !/\s/.test(s), { message: 'API base URL must not contain whitespace' }),
  supabaseUrl: z
    .string({ required_error: 'Missing EXPO_PUBLIC_SUPABASE_URL' })
    .transform((s) => s.trim())
    .pipe(z.string().url({ message: 'EXPO_PUBLIC_SUPABASE_URL must be a valid URL' }))
    .refine((s) => !/YOUR-PROJECT/i.test(s), {
      message: 'EXPO_PUBLIC_SUPABASE_URL must be your real Supabase project URL (not the YOUR-PROJECT placeholder)',
    }),
  supabaseAnonKey: z
    .string({ required_error: 'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY' })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(32, 'EXPO_PUBLIC_SUPABASE_ANON_KEY looks too short to be a valid Supabase anon key')
        .refine((k) => !/^REPLACE_ME$/i.test(k) && !/^your-anon-key$/i.test(k) && !/^INCOLLA_LA_ANON_KEY$/i.test(k), {
          message: 'Replace EXPO_PUBLIC_SUPABASE_ANON_KEY with your real anon / publishable key from Supabase Studio',
        }),
    ),
});

function readEnv(): AppEnv {
  const raw = readRawFromProcessAndExtra();
  const parsed = mobilePublicEnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MobileEnvValidationError(formatZodError(parsed.error));
  }
  return parsed.data;
}

export const env: AppEnv = readEnv();
