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
          border: '#e3e9f1',    // weicher, weniger blaustichig
          blue:   '#8fb3cf',    // Hero-Subtext
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        brand: '14px',
        'brand-sm': '10px',
        'brand-lg': '20px',
      },
      boxShadow: {
        // Weiche, mehrschichtige Elevation für ruhige Tiefe statt flacher Kanten
        'brand-sm': '0 1px 2px rgba(15,30,46,0.05)',
        brand:      '0 2px 6px rgba(15,30,46,0.04), 0 10px 28px rgba(15,30,46,0.07)',
        'brand-lg': '0 6px 14px rgba(15,30,46,0.06), 0 20px 44px rgba(15,30,46,0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config
