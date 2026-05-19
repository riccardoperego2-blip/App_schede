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
          primary: '#030507',
          surface: '#090F16',
          elevated: '#101821',
          glass: '#060A0F',
          card: '#0B1118',
          inverse: '#F4F6F8',
        },
        border: {
          soft: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A3ADBD',
          muted: '#667085',
          inverse: '#0B0F14',
        },
        accent: {
          DEFAULT: '#39FF88',
          strong: '#23E66F',
          neon: '#9CFFBD',
          subtle: '#123B28',
          purple: '#9B5CFF',
          blue: '#1EA7FF',
          cyan: '#20E3C2',
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
