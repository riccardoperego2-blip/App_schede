/**
 * Design tokens — single source of truth for spacing, type scale, motion, elevation.
 * Tailwind/NativeWind covers colors and radii; this file owns dimensions only consumed in TS.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -0.5, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: -0.3, fontWeight: '700' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  tiny: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;

export const motion = {
  duration: { fast: 150, base: 240, slow: 360 },
  easing: { standard: 'cubic-bezier(0.2, 0, 0, 1)' },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export type Spacing = keyof typeof spacing;
export type TypographyVariant = keyof typeof typography;
