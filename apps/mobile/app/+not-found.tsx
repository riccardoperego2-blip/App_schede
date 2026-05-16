import { Link } from 'expo-router';
import { Screen, Text, Button } from '../src/design-system';

export default function NotFound() {
  return (
    <Screen>
      <Text variant="title">Schermata non trovata</Text>
      <Text tone="muted">La rotta richiesta non esiste.</Text>
      <Link href="/(tabs)" asChild>
        <Button label="Torna alla home" />
      </Link>
    </Screen>
  );
}
