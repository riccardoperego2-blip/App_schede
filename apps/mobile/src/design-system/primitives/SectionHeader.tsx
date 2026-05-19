import { View } from 'react-native';
import { Text } from './Text';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, subtitle, trailing }: SectionHeaderProps) {
  return (
    <View className="flex-row items-end justify-between gap-4">
      <View className="flex-1">
        {eyebrow ? (
          <Text variant="tiny" tone="muted" className="mb-1 tracking-widest">
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
