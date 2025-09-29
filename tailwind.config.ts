import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.mdx', './public/**/*.svg'],
  theme: {
    extend: {
      colors: {
        'fase': {
          'navy': '#2D5574',        // Primary blue
          'black': '#231F20',       // Very dark gray/black
          'orange': '#B46A33',      // Dark brown/orange
          'gold': '#E2A560',        // Light brown/gold
          'light-gold': '#E6C06E',  // Light gold
          'cream': '#EBE8E4',       // Very light cream
          // Legacy aliases for backward compatibility
          'steel': '#231F20',       // Same as black
          'graphite': '#B46A33',    // Same as orange
          'platinum': '#E2A560',    // Same as gold
          'silver': '#E6C06E',      // Same as light-gold
          'pearl': '#EBE8E4',       // Same as cream
          'paper': '#EBE8E4',       // Same as cream
          'teal': '#2D5574',        // Same as navy
          'emerald': '#B46A33',     // Same as orange
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
