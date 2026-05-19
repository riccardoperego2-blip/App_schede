import { View } from 'react-native';
import { PremiumCard } from './PremiumCard';
import { Text } from './Text';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  accent?: boolean;
}

export function MetricCard({ label, value, helper, accent = false }: MetricCardProps) {
  return (
    <PremiumCard variant="glass" className="flex-1 gap-1.5 p-4">
      {accent ? <View className="mb-0.5 h-0.5 w-7 rounded-pill bg-accent/70" /> : null}
      <Text variant="tiny" tone="muted" className="tracking-wide">
        {label.toUpperCase()}
      </Text>
      <Text variant="subtitle" className="font-semibold">
        {value}
      </Text>
      {helper ? (
        <Text variant="tiny" tone="muted">
          {helper}
        </Text>
      ) : null}
    </PremiumCard>
  );
}
