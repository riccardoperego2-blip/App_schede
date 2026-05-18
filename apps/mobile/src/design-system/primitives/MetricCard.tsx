import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  accent?: boolean;
}

export function MetricCard({ label, value, helper, accent = false }: MetricCardProps) {
  return (
    <Card elevated accent={accent} className="flex-1 gap-2">
      <View className="h-1.5 w-10 rounded-pill bg-accent" />
      <Text variant="tiny" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="title">{value}</Text>
      {helper ? (
        <Text variant="tiny" tone="muted">
          {helper}
        </Text>
      ) : null}
    </Card>
  );
}
