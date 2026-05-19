import { Platform } from 'react-native';
import { colors } from './colors';

export const shadows = {
  soft: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 5 },
    default: {},
  }),
  glow: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  ambient: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.42,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;
