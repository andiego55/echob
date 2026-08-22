/**
 * Konfiguration der Tests — bewusst eine eigene Datei.
 *
 * Vitest liest `vitest.config.ts` von selbst und lässt `vite.config.ts` in Ruhe. Der ganze
 * Testaufbau besteht damit aus drei Dingen, die zusammen wieder verschwinden können:
 *
 *     vitest.config.ts     diese Datei
 *     tests/               die Prüfungen
 *     package.json         eine Zeile "test", eine Abhängigkeit
 *
 * Kein Testcode im Quelltext, keine Mock-Schicht, keine Test-Exporte in Produktionsdateien.
 *
 * `environment: 'node'` ist Absicht: Geprüft werden ausschließlich reine Funktionen. Kein
 * jsdom, kein React, kein Rendern — Tests, die gerendertes Markup abklopfen, schreiben nur
 * die Implementierung ab und werden bei jeder Designänderung rot, ohne dass ein Fehler
 * dahintersteckt.
 */
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const hier = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(hier, './src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: 'dot',
  },
})
