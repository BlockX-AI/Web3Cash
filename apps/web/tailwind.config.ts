import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        ring: 'var(--ring)',
        'menu-card': 'var(--menu-card)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '25': '6.25rem',
        '30': '7.5rem',
        '50': '12.5rem',
        '70': '17.5rem',
        '82': '20.5rem',
        '100': '25rem',
        '112.5': '28.125rem',
        '125': '31.25rem',
        '137.5': '34.375rem',
        '150': '37.5rem',
        '175': '43.75rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
