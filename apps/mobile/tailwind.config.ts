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
          primary: '#0B0F14',
          surface: '#10161D',
          elevated: '#171F28',
          inverse: '#F4F6F8',
        },
        text: {
          primary: '#F4F6F8',
          secondary: '#A4ADBA',
          muted: '#6B7585',
          inverse: '#0B0F14',
        },
        accent: {
          DEFAULT: '#5BE3A1',
          strong: '#33CE87',
          subtle: '#143C2A',
        },
        warning: '#F5B642',
        danger: '#F26C6C',
      },
      borderRadius: {
        card: '20px',
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
