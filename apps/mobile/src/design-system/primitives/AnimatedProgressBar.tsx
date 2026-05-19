import { useEffect, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '../motion';

interface AnimatedProgressBarProps {
  value: number;
  max: number;
  heightClassName?: string;
}

export function AnimatedProgressBar({
  value,
  max,
  heightClassName = 'h-2.5',
}: AnimatedProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const width = useSharedValue(0);
  const targetPct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;

  useEffect(() => {
    if (trackWidth <= 0) return;
    width.value = withTiming((targetPct / 100) * trackWidth, {
      duration: motion.slow,
      easing: motion.easing,
    });
  }, [targetPct, trackWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && nextWidth !== trackWidth) {
      setTrackWidth(nextWidth);
    }
  };

  return (
    <View className={`overflow-hidden rounded-pill bg-bg-glass ${heightClassName}`} onLayout={onLayout}>
      <Animated.View className="h-full rounded-pill bg-accent" style={fillStyle} />
    </View>
  );
}
