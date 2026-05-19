import { View } from 'react-native';
import { Text } from './Text';

interface StatPillProps {
  label: string;
  value: string | number;
  active?: boolean;
}

export function StatPill({ label, value, active = false }: StatPillProps) {
  return (
    <View
      className={[
        'rounded-pill border px-3.5 py-2.5',
        active ? 'border-border-soft bg-bg-glass' : 'border-border-soft bg-bg-surface',
      ].join(' ')}
    >
      <Text variant="tiny" tone="muted" className="tracking-wide">
        {label.toUpperCase()}
      </Text>
      <Text variant="caption" tone={active ? 'accent' : 'primary'} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
