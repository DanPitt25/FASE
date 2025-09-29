import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.mdx', './public/**/*.svg'],
  theme: {
    extend: {
      colors: {
        'fase': {
          'navy': '#2D5574',        // Primary blue (was #063e56)
          'steel': '#231F20',       // Very dark gray/black (was #4a4a4a) 
          'graphite': '#B46A33',    // Dark brown/orange accent (was #6b6b6b)
          'platinum': '#E2A560',    // Light brown/gold (was #8d8d8d)
          'silver': '#E6C06E',      // Light gold (was #b5b5b5)
          'pearl': '#EBE8E4',       // Very light gray (was #e8e8e8)
          'paper': '#EBE8E4',       // Same as pearl for consistency (was #f8f8f8)
          'teal': '#2D5574',        // Use navy for teal consistency
          'gold': '#E2A560',        // Light brown/gold
          'emerald': '#B46A33',     // Dark brown/orange for emerald
          'orange': '#B46A33',      // Dark brown/orange
        }
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'lato': ['Lato', 'system-ui', 'sans-serif'],
      }
    }
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
} satisfies Config;
