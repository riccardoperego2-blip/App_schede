import { Pressable, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, shadows } from '../../theme';
import { motion } from '../motion';

interface PremiumCardProps extends ViewProps {
  glow?: boolean;
  variant?: 'default' | 'elevated' | 'glow' | 'glass' | 'ambient';
  pressable?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

function AmbientLight() {
  return (
    <>
      <View
        pointerEvents="none"
        className="absolute -right-16 -top-24 h-56 w-56 rounded-full"
        style={{ backgroundColor: `${colors.primary}14` }}
      />
      <View
        pointerEvents="none"
        className="absolute -left-20 bottom-[-100px] h-52 w-52 rounded-full"
        style={{ backgroundColor: `${colors.accentPurple}0A` }}
      />
      <View
        pointerEvents="none"
        className="absolute right-8 top-12 h-32 w-32 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      />
    </>
  );
}

export function PremiumCard({
  glow = false,
  variant = 'default',
  pressable = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  className = '',
  style,
  children,
  testID,
  ...rest
}: PremiumCardProps) {
  const isAmbient = glow || variant === 'glow' || variant === 'ambient';
  const isPressable = pressable && typeof onPress === 'function';
  const variantStyle = {
    default: { backgroundColor: colors.card, borderColor: colors.border },
    elevated: { backgroundColor: colors.surfaceLight, borderColor: colors.border },
    glow: { backgroundColor: colors.card, borderColor: colors.border },
    ambient: { backgroundColor: colors.card, borderColor: colors.border },
    glass: { backgroundColor: colors.surface, borderColor: colors.border },
  }[variant === 'glow' ? 'ambient' : variant];

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const cardStyle = [
    {
      borderRadius: variant === 'elevated' || isAmbient ? 24 : 20,
      ...variantStyle,
    },
    isAmbient ? shadows.ambient : shadows.soft,
    style,
  ];

  const content = (
    <>
      {isAmbient ? <AmbientLight /> : null}
      {children}
    </>
  );

  if (isPressable) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: motion.fast });
          opacity.value = withTiming(0.94, { duration: motion.fast });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motion.spring);
          opacity.value = withTiming(1, { duration: motion.base });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        <Animated.View
          className={['overflow-hidden border p-5', className].join(' ')}
          style={[cardStyle, animatedStyle]}
          {...rest}
        >
          {content}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View
      className={['overflow-hidden border p-5', className].join(' ')}
      style={cardStyle}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...rest}
    >
      {content}
    </View>
  );
}
