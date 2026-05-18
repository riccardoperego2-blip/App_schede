import { Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';

interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  active?: boolean;
}

export function Chip({ label, active = false, className = '', ...rest }: ChipProps & { className?: string }) {
  return (
    <Pressable
      className={[
        'min-h-[42px] items-center justify-center rounded-pill border px-4 py-2',
        active ? 'border-accent bg-accent' : 'border-border-soft bg-bg-glass',
        className,
      ].join(' ')}
      {...rest}
    >
      <Text tone={active ? 'inverse' : 'secondary'} variant="caption" className="font-bold">
        {label}
      </Text>
    </Pressable>
  );
}
