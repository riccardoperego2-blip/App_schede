import { View } from 'react-native';
import { Text } from './Text';

interface SectionProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, subtitle, trailing, children }: SectionProps) {
  return (
    <View className="gap-4">
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text variant="title">{title}</Text>
          {subtitle ? <Text tone="muted" variant="caption">{subtitle}</Text> : null}
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}
