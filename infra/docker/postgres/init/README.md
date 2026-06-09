# Postgres Init-Scripts

SQL-Dateien in diesem Ordner werden beim **ersten Start** des Postgres-Containers
in alphabetischer Reihenfolge ausgeführt (nur wenn das Volume noch leer ist).

Beispiel für spätere Schemas:

```
01_extensions.sql   → CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
02_schema.sql       → Tabellen anlegen
03_seed.sql         → Testdaten für lokale Entwicklung
```

Aktuell: keine Init-Scripts – Postgres startet mit leerem `echob`-Schema.
Migrationen werden später über Supabase CLI oder Alembic verwaltet.
