import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.mdx', './public/**/*.svg'],
  theme: {
    extend: {
      colors: {
        'fase': {
          'dark-slate': '#434f5d',
          'navy': '#085275',
          'sage': '#5e8269',
          'blue-gray': '#8c9cab',
          'light-gray': '#bac6ca',
          'warm-gray': '#d9d5d2',
          'ice-blue': '#ebf7ff',
          'orange': '#ffac3f',
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
