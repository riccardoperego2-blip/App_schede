import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  elevated?: boolean;
  accent?: boolean;
}

export function Card({ elevated = false, accent = false, className = '', children, ...rest }: CardProps) {
  return (
    <View
      className={[
        'rounded-card border p-5',
        elevated ? 'border-border-soft bg-bg-elevated' : 'border-border-soft/70 bg-bg-surface',
        accent ? 'border-accent/35 bg-accent-subtle/50' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}
