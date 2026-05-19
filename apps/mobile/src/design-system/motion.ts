import { Easing } from 'react-native-reanimated';

export const motion = {
  fast: 180,
  base: 280,
  slow: 360,
  easing: Easing.out(Easing.cubic),
  spring: { damping: 18, stiffness: 280 },
} as const;
