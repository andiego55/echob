# Tests

Prüfungen für die Stellen im Frontend, an denen eine **Entscheidung** fällt und
ein falsches Ergebnis lautlos bleibt: kein Absturz, kein Typfehler, kein roter Build.

| Datei | Was schiefgehen kann, ohne dass es auffällt |
|---|---|
| `paartests-sicherheit.test.ts` | Ein Test über Gaslighting oder Missbrauch wird im Paarraum ausfüllbar — eine Person schätzt die andere im gemeinsam gelesenen Raum ein. |
| `testauswertung.test.ts` | Eine Skala kippt. Das Ergebnis sieht plausibel aus, ist aber falsch, und jemand liest es über die eigene Beziehung. |
| `fehlermeldungen.test.ts` | Ein neuer Fehler-Code rutscht durch die Übersetzung, und der Nutzer liest wörtlich `ECHO_LIMIT_REACHED`. |
| `abmachungsvorschlaege.test.ts` | Der Prompt wird umformuliert, der Parser findet nichts mehr — die Ein-Klick-Übernahme verschwindet, ohne dass etwas fehlschlägt. |
| `text-takt.test.ts` | Das Tempo von Echos Antwort verrutscht — vier Zahlen, die man nur am Gefühl bemerkt. |
| `vorlese-stille.test.ts` | Die erzwungene Pause zwischen zwei vorgelesenen Mitteilungen verschwindet. Der Vorlese-Modus läuft weiter — ohne das, wofür es ihn gibt. |
| `fall-navigation.test.ts` | Der falsche Reiter leuchtet, oder man steht auf „Überblick", während man in einem Selbsttest arbeitet. |

## Was hier bewusst **nicht** steht

Keine Snapshot-Tests, keine gerenderten Komponenten, keine nachgebaute API. Solche Tests
schreiben die Implementierung ab: Sie werden bei jeder Designänderung rot, ohne dass ein
Fehler dahintersteckt — und irgendwann aktualisiert man sie nur noch, statt sie zu lesen.

Alles hier Geprüfte sind reine Funktionen. Deshalb `environment: 'node'`: kein jsdom, kein
React, keine Mocks. Der ganze Lauf dauert unter drei Sekunden.

## Sind die Tests etwas wert?

Nachgewiesen mit einer Mutationsprobe: Jede der fünf Stellen wurde absichtlich kaputt
gemacht — auf die Art, wie man es beim Umbauen wirklich tut — und jedes Mal wurde die
Prüfung rot. Sechs von sechs.

Dabei kam auch etwas heraus: Eine Sortierung in `gruppeFuer` liess sich entfernen, **ohne**
dass ein Test anschlug. Sie verteidigte eine Lage, die es gar nicht gibt (keine Kindroute
ist Präfix einer anderen). Statt ihrer sichert jetzt ein Test genau diese Eigenschaft.

## Ausführen

```
npm test          # einmal
npm run test:watch
```

## Wieder entfernen

Der Aufbau ist absichtlich nicht mit dem Quelltext verwoben. Zum vollständigen Entfernen:

1. `apps/web/tests/` löschen
2. `apps/web/vitest.config.ts` löschen
3. In `apps/web/package.json` die Zeilen `test` und `test:watch` sowie `vitest` unter
   `devDependencies` entfernen
4. In `.github/workflows/ci.yml` den Schritt „Tests" (drei Zeilen) entfernen

Im Anwendungscode bleibt danach nichts zurück — es gibt dort keine Test-Exporte, keine
Schalter und keine Attrappen. Einzig `src/components/app/caseNavGroups.ts` ist im Zuge
dieser Arbeit entstanden: Die Gliederung des Falls steht seither getrennt von ihrer
Darstellung. Das ist auch ohne Tests die bessere Aufteilung und darf bleiben.
