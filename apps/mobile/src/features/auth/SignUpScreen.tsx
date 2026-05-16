import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { z } from 'zod';
import { Screen, Text, Button, Card } from '../../design-system';
import { useAuthStore } from '../../stores/auth.store';

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z
    .string()
    .min(8, 'Almeno 8 caratteri')
    .regex(/[A-Z]/, 'Almeno una maiuscola')
    .regex(/[0-9]/, 'Almeno un numero'),
});

export function SignUpScreen() {
  const signUp = useAuthStore((s) => s.signUpWithPassword);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dati non validi');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp(parsed.data.email, parsed.data.password);
      setSuccess(true);
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
          <Text variant="display">Inizia ora</Text>
          <Text tone="muted">Crea l'account e ricevi il tuo primo programma.</Text>
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
              keyboardType="email-address"
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
              placeholder="Crea una password sicura"
              placeholderTextColor="#6B7585"
              className="h-12 rounded-xl bg-bg-elevated px-4 text-text-primary"
            />
          </View>
          {error ? (
            <Text tone="danger" variant="caption">
              {error}
            </Text>
          ) : null}
          {success ? (
            <Text tone="accent" variant="caption">
              Account creato. Controlla la tua email per confermare.
            </Text>
          ) : null}
          <Button label="Crea account" loading={submitting} onPress={submit} />
        </Card>

        <Link href="/(auth)/sign-in" replace>
          <Text tone="muted" className="text-center">
            Hai già un account? <Text tone="accent">Accedi</Text>
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
