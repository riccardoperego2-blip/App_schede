import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#070B10',
          surface: '#0E151D',
          elevated: '#151F2A',
          glass: '#1B2733',
          inverse: '#F4F6F8',
        },
        border: {
          soft: '#223040',
          strong: '#314154',
        },
        text: {
          primary: '#F7FAFC',
          secondary: '#B4C0CD',
          muted: '#7D8997',
          inverse: '#0B0F14',
        },
        accent: {
          DEFAULT: '#22C55E',
          strong: '#16A34A',
          neon: '#86EFAC',
          subtle: '#102E20',
        },
        warning: '#F5B642',
        danger: '#F26C6C',
      },
      borderRadius: {
        card: '24px',
        xl2: '28px',
        pill: '999px',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        display: ['InterDisplay', 'Inter', 'System'],
      },
    },
  },
  plugins: [],
};

export default config;
