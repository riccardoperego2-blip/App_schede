/**
 * Semantic theme. The dark theme is the premium baseline; light is the alternative.
 * Tailwind values are duplicated here only for non-class contexts (charts, status bar).
 */
export const theme = {
  dark: {
    background: '#0B0F14',
    surface: '#10161D',
    elevated: '#171F28',
    border: '#1F2832',
    accent: '#5BE3A1',
    accentMuted: '#143C2A',
    text: '#F4F6F8',
    textSecondary: '#A4ADBA',
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
