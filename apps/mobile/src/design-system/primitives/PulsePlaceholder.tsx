import { useEffect } from 'react';
import { type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface PulsePlaceholderProps extends ViewProps {
  className?: string;
}

export function PulsePlaceholder({ className = '', style, ...rest }: PulsePlaceholderProps) {
  const opacity = useSharedValue(0.32);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.55, { duration: 900 }), withTiming(0.32, { duration: 900 })),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={['rounded-card bg-bg-glass', className].join(' ')}
      style={[animatedStyle, style]}
      {...rest}
    />
  );
}
