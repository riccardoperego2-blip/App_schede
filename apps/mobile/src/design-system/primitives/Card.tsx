import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  elevated?: boolean;
  accent?: boolean;
}

export function Card({ elevated = false, accent = false, className = '', children, ...rest }: CardProps) {
  return (
    <View
      className={[
        'rounded-card border border-border-soft p-5',
        elevated ? 'bg-bg-elevated' : 'bg-bg-card',
        accent ? 'bg-bg-card' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}
