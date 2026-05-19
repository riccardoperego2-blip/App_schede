import { useEffect, type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../motion';

interface FadeInSectionProps {
  children: ReactNode;
  delay?: number;
  offsetY?: number;
  className?: string;
  style?: ViewStyle;
}

export function FadeInSection({
  children,
  delay = 0,
  offsetY = 10,
  className = '',
  style,
}: FadeInSectionProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offsetY);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: motion.base, easing: motion.easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration: motion.base, easing: motion.easing }));
  }, [delay, offsetY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} className={className}>
      {children}
    </Animated.View>
  );
}
