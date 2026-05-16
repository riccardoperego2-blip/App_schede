import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { z } from 'zod';
import { Screen, Text, Button, Card } from '../../design-system';
import { useAuthStore } from '../../stores/auth.store';

const formSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Almeno 8 caratteri'),
});

export function SignInScreen() {
  const signIn = useAuthStore((s) => s.signInWithPassword);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = formSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dati non validi');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View className="gap-8 pt-6">
        <View className="gap-2">
          <Text variant="display">Bentornato</Text>
          <Text tone="muted">Accedi per riprendere il tuo programma.</Text>
        </View>

        <Card className="gap-4">
          <View className="gap-2">
            <Text variant="caption" tone="secondary">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="tu@email.com"
              placeholderTextColor="#6B7585"
              className="h-12 rounded-xl bg-bg-elevated px-4 text-text-primary"
            />
          </View>
          <View className="gap-2">
            <Text variant="caption" tone="secondary">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              placeholder="••••••••"
              placeholderTextColor="#6B7585"
              className="h-12 rounded-xl bg-bg-elevated px-4 text-text-primary"
            />
          </View>
          {error ? (
            <Text tone="danger" variant="caption">
              {error}
            </Text>
          ) : null}
          <Button label="Accedi" loading={submitting} onPress={submit} />
        </Card>

        <Link href="/(auth)/sign-up" replace>
          <Text tone="muted" className="text-center">
            Nuovo qui? <Text tone="accent">Crea account</Text>
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
