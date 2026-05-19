import { Pressable, type PressableProps, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { hitSlop } from '../tokens';
import { shadows } from '../../theme';
import { motion } from '../motion';

type Variant = 'primary' | 'secondary' | 'ghost';

interface PremiumButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent active:bg-accent-strong',
  secondary: 'border border-border-soft bg-bg-glass active:bg-bg-elevated',
  ghost: 'bg-transparent active:bg-bg-glass',
};

export function PremiumButton({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  haptic = true,
  onPress,
  className = '',
  ...rest
}: PremiumButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, fullWidth ? { width: '100%' } : undefined]}>
      <Pressable
        hitSlop={hitSlop}
        disabled={isDisabled}
        onPressIn={() => {
          if (isDisabled) return;
          scale.value = withTiming(0.97, { duration: motion.fast });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motion.spring);
        }}
        onPress={(event) => {
          if (isDisabled) return;
          if (haptic) {
            void Haptics.impactAsync(
              variant === 'primary' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft,
            );
          }
          onPress?.(event);
        }}
        className={[
          'min-h-[52px] flex-row items-center justify-center rounded-pill px-6',
          variantClass[variant],
          fullWidth ? 'w-full' : '',
          isDisabled ? 'opacity-45' : '',
          className,
        ].join(' ')}
        style={variant === 'primary' && !isDisabled ? shadows.glow : undefined}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#030507' : '#FFFFFF'} />
        ) : (
          <View className="flex-row items-center gap-2">
            <Text tone={variant === 'primary' ? 'inverse' : 'primary'} variant="body" className="font-semibold">
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
