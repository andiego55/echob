# Postgres Init-Scripts

Die SQL-Dateien hier werden beim **ersten Start** des Postgres-Containers ausgeführt
(nur solange das Volume leer ist) — und in **alphabetischer** Reihenfolge, nicht in
numerischer. Dieselbe Reihenfolge fährt die CI (`for f in .../*.sql`).

In Produktion werden sie **einzeln von Hand** eingespielt, jede mit
`-v ON_ERROR_STOP=1`; jede Datei nennt den Befehl in ihrem Kopf. Alle Skripte sind
idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`), damit ein zweiter Lauf nichts kaputt
macht.

## Die Falle bei der Reihenfolge

Alphabetisch heißt: `100_` und `101_` sortieren zwischen `09_` und `10_`, nicht hinter
`99_`. Solange eine Migration nur Tabellen mit **kleinerer zweistelliger** Nummer
braucht, fällt das nicht auf — `100_professional_findings` etwa hängt an `08_`.

Sobald eine dreistellige Migration etwas aus dem 30er-, 60er- oder 90er-Bereich braucht,
bricht ein frisches Schema ab. Solche Dateien bekommen deshalb ein `zz_` davor
(`zz_101_admin_user_roles.sql`): Buchstaben sortieren nach Ziffern, also läuft die Datei
garantiert zuletzt. Die Nummer bleibt im Namen stehen, damit die Reihe lesbar bleibt.

Wer das sauberer will, müsste alle Dateien auf dreistellige Nummern umstellen
(`008_`, `038_`, …) — ein Umbenennen quer durch den Ordner, das seinen eigenen Termin
verdient.
