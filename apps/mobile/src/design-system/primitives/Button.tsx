import { Pressable, type PressableProps, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { hitSlop } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent active:bg-accent-strong',
  secondary: 'bg-bg-glass active:bg-bg-elevated border border-border-soft',
  ghost: 'bg-transparent active:bg-bg-elevated border border-transparent',
  danger: 'bg-danger/15 active:bg-danger/25 border border-danger/40',
};

const variantText: Record<Variant, 'inverse' | 'primary' | 'danger'> = {
  primary: 'inverse',
  secondary: 'primary',
  ghost: 'primary',
  danger: 'danger',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-11 px-4',
  md: 'h-13 min-h-[52px] px-5',
  lg: 'h-15 min-h-[60px] px-6',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  disabled,
  leadingIcon,
  onPress,
  className: _className,
  ...rest
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      hitSlop={hitSlop}
      disabled={isDisabled}
      onPress={(e) => {
        if (variant === 'primary' || variant === 'danger') {
          Haptics.selectionAsync().catch(() => undefined);
        }
        onPress?.(e);
      }}
      className={[
        'flex-row items-center justify-center rounded-pill',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-60' : '',
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0B0F14' : '#F4F6F8'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {leadingIcon}
          <Text tone={variantText[variant]} variant="body" className="font-semibold">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
