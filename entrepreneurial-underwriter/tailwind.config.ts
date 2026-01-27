import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'fase': {
          'navy': '#2D5574',
          'orange': '#B46A33',
        }
      },
    }
  },
  plugins: [],
} satisfies Config;
