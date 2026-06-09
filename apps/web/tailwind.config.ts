import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Exakte Farben aus der Static Site (styles.css)
        navy: {
          DEFAULT: '#0f1e2e',   // --navy
          mid:     '#1e3a55',   // --navy-mid
          dark:    '#070e18',   // Footer-Hintergrund
        },
        accent: {
          DEFAULT: '#e07b54',   // --accent
          hover:   '#c8623c',   // --accent-h
        },
        brand: {
          bg:     '#f6f9fc',    // --bg  (Seitenhintergrund)
          card:   '#ffffff',    // --card
          text:   '#1a2535',    // --text
          muted:  '#4a6070',    // --muted
          border: '#d8e4f0',    // --border
          blue:   '#8fb3cf',    // Hero-Subtext
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        brand: '10px',
      },
    },
  },
  plugins: [],
} satisfies Config
