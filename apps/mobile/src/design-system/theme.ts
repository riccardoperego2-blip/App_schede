/**
 * Semantic theme. The dark theme is the premium baseline; light is the alternative.
 * Tailwind values are duplicated here only for non-class contexts (charts, status bar).
 */
export const theme = {
  dark: {
    background: '#070B10',
    surface: '#0E151D',
    elevated: '#151F2A',
    border: '#223040',
    accent: '#22C55E',
    accentMuted: '#102E20',
    text: '#F7FAFC',
    textSecondary: '#B4C0CD',
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
