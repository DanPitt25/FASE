import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.mdx', './public/**/*.svg'],
  theme: {
    extend: {
      colors: {
        'fase': {
          'black': '#231F20',       // Footer only
          'navy': '#2D5574',        // Hero/CTA sections
          'light-blue': '#93AAC0',  // Crucial hero color
          'orange': '#B46A33',      // Accent color
          'gold': '#E2A560',        // Accent color
          'light-gold': '#E6C06E',  // Accent color  
          'cream': '#EBE8E4',       // Hero/light sections
        }
      },
      fontFamily: {
        'noto-serif': ['Noto Serif', 'serif'],
        'dm-sans': ['DM Sans', 'system-ui', 'sans-serif'],
        // Legacy font aliases for gradual migration
        'playfair': ['Noto Serif', 'serif'],
        'lato': ['DM Sans', 'system-ui', 'sans-serif'],
      }
    }
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
} satisfies Config;
