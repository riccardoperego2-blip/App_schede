import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { env } from '@/lib/env';

type ProbeResult =
  | { ok: true; status: number; url: string; body: string }
  | { ok: false; url: string; error: string; name?: string; message?: string; stack?: string };

function toHttps(base: string): string {
  return base.replace(/^http:\/\//i, 'https://');
}

export default function NetworkDebugScreen() {
  const [last, setLast] = useState<string>('Tap a button to probe the API.');
  const [loading, setLoading] = useState(false);

  const probe = useCallback(async (useHttps: boolean) => {
    const base = useHttps ? toHttps(env.apiBaseUrl) : env.apiBaseUrl;
    const url = `${base}/v1/health`;
    setLoading(true);
    setLast(`Fetching ${url} …`);
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Client': 'mobile-network-debug' },
      });
      const text = await r.text();
      const payload: ProbeResult = {
        ok: true,
        status: r.status,
        url,
        body: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
      };
      setLast(JSON.stringify(payload, null, 2));
    } catch (e) {
      const err = e as Error;
      const payload: ProbeResult = {
        ok: false,
        url,
        error: String(e),
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      };
      setLast(JSON.stringify(payload, null, 2));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Network debug',
          headerShown: true,
          headerStyle: { backgroundColor: '#0B0F14' },
          headerTintColor: '#e6edf3',
          headerTitleStyle: { color: '#e6edf3' },
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <Text className="text-zinc-400 text-sm">
          Temporary screen: raw fetch (no http-client) to isolate &quot;Network request failed&quot;.
        </Text>
        <Text className="text-white font-mono text-xs" selectable>
          env.apiBaseUrl: {env.apiBaseUrl}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => void probe(false)}
            disabled={loading}
            className="rounded-lg bg-emerald-700 px-3 py-2 active:opacity-80"
          >
            <Text className="text-white font-medium">GET health (HTTP)</Text>
          </Pressable>
          <Pressable
            onPress={() => void probe(true)}
            disabled={loading}
            className="rounded-lg bg-amber-700 px-3 py-2 active:opacity-80"
          >
            <Text className="text-white font-medium">GET health (HTTPS)</Text>
          </Pressable>
        </View>
        {loading ? <Text className="text-zinc-400">Loading…</Text> : null}
        <Text className="text-zinc-200 font-mono text-xs" selectable>
          {last}
        </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable>
            <Text className="text-sky-400 py-4">← Back to sign-in</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </>
  );
}
