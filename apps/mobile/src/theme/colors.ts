export const colors = {
  background: '#030507',
  backgroundSoft: '#060A0F',
  surface: '#090F16',
  surfaceLight: '#101821',
  card: '#0B1118',
  primary: '#39FF88',
  primarySoft: '#23E66F',
  primaryMuted: '#123B28',
  accent: '#9B5CFF',
  accentPurple: '#9B5CFF',
  accentBlue: '#1EA7FF',
  accentCyan: '#20E3C2',
  text: '#FFFFFF',
  textSecondary: '#A3ADBD',
  textMuted: '#667085',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  danger: '#F26C6C',
  warning: '#F5B642',
} as const;

export type AppColor = keyof typeof colors;
