/**
 * Semantic theme. The dark theme is the premium baseline; light is the alternative.
 * Tailwind values are duplicated here only for non-class contexts (charts, status bar).
 */
export const theme = {
  dark: {
    background: '#030507',
    surface: '#090F16',
    elevated: '#101821',
    border: 'rgba(255,255,255,0.06)',
    accent: '#39FF88',
    accentMuted: '#123B28',
    text: '#FFFFFF',
    textSecondary: '#A3ADBD',
    danger: '#F26C6C',
    warning: '#F5B642',
  },
  light: {
    background: '#F4F6F8',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    border: '#E1E5EB',
    accent: '#1A8F60',
    accentMuted: '#DAF4E7',
    text: '#0B0F14',
    textSecondary: '#4A5560',
    danger: '#C8453F',
    warning: '#A87514',
  },
} as const;

export type AppTheme = (typeof theme)['dark'];
