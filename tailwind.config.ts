import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.mdx', './public/**/*.svg'],
  theme: {
    extend: {
      colors: {
        'fase': {
          'navy': '#063e56',
          'steel': '#4a4a4a',
          'graphite': '#6b6b6b', 
          'platinum': '#8d8d8d',
          'silver': '#b5b5b5',
          'pearl': '#e8e8e8',
          'paper': '#f8f8f8',
        }
      },
      fontFamily: {
        'futura': ['Futura', 'Lato', 'system-ui', 'sans-serif'],
        'lato': ['Lato', 'system-ui', 'sans-serif'],
      }
    }
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
} satisfies Config;
