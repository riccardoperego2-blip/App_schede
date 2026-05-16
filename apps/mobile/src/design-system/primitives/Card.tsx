import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ elevated = false, className = '', children, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-card p-4 ${elevated ? 'bg-bg-elevated' : 'bg-bg-surface'} ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
