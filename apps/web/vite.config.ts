import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Beim SSR-Bau sind React & Co. externe Module - dort darf manualChunks nicht
      // greifen ("cannot be included in manualChunks because it is resolved as an
      // external module"). Das Prerendering braucht die Aufteilung ohnehin nicht:
      // Es rendert einmal in Node und wirft das Buendel danach weg.
      output: isSsrBuild ? {} : {
        /**
         * Getrennte Buendel fuer Dinge, die sich unterschiedlich schnell aendern.
         *
         * Vorher lag alles in EINEM Stueck: 3 MB, 841 KB gzip. Jede Textaenderung an einer
         * Wissensseite machte damit auch React, Router und Supabase im Browser-Cache
         * ungueltig - beim naechsten Besuch wurde alles neu geladen.
         *
         * Die Trennung ist nach LEBENSDAUER gewaehlt, nicht nach Groesse:
         *
         *   react       aendert sich ein paarmal im Jahr
         *   daten       aendert sich, wenn Redaktion neue Seiten schreibt
         *   anbieter    Supabase, Sentry, Markdown - selten
         *
         * Der Erstbesuch laedt gleich viel, der ZWEITE deutlich weniger. Und das ist der
         * Besuch, bei dem jemand wiederkommt, um weiterzuarbeiten.
         */
        manualChunks: {
          react:    ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          supabase: ['@supabase/supabase-js'],
          sentry:   ['@sentry/react'],
          anbieter: ['@tanstack/react-query', 'axios'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // API-Calls an /api/* werden lokal an die FastAPI weitergeleitet
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}))