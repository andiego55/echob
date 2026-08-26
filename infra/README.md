# EchoB – Infrastruktur

Konfiguration und Betriebsskripte für den Produktivbetrieb auf Hetzner (`/opt/echob`) und
für die lokale Entwicklung.

| Ordner | Was drin liegt |
|---|---|
| `backup/` | Täglicher verschlüsselter Datenbank-Dump und der Wiederherstellungs-Beweis. → [README](backup/README.md) |
| `monitor/` | Wächter (Platte, Backup-Alter, API) und der Alarmweg per Mail. → [README](monitor/README.md) |
| `caddy/` | Reverse Proxy für `api.echo-b.de`, TLS über Let's Encrypt |
| `cloudflare/` | Cloudflare Pages, DNS, Cache- und Header-Regeln fürs Frontend |
| `docker/` | Compose für die lokale Entwicklung und die Postgres-Init-Skripte (Migrationen) |
| `supabase/` | Auth-Konfiguration, RLS-Policies, Seed-Daten |

## Zwei Dinge, die man hier leicht falsch annimmt

**`/opt/echob` ist eine Git-Auscheckung.** Ein Deploy ist `git pull` plus Neubau des
`api`-Abbilds — kein Dateitransfer, keine Sicherungskopie daneben. Der Ablauf steht in
[`../DEPLOY.md`](../DEPLOY.md).

**Die Skripte in `backup/` und `monitor/` laufen direkt aus dieser Auscheckung.** Sie werden
nicht auf den Server kopiert; ein `git pull` aktualisiert sie mit. Nur Geheimnisse und
Zustandsdateien liegen außerhalb (`/opt/echob/.env.docker`, `/var/backups/echob/`).

## Migrationen

Die SQL-Dateien unter `docker/postgres/init/` (aktuell 96) laufen **automatisch nur bei
einem frischen Postgres-Volume**. Auf der bestehenden Produktionsdatenbank wird jede neue
Datei einmalig von Hand eingespielt — **vor** dem Neubau der API, sonst startet sie gegen
ein altes Schema. Details und der fertige Befehl stehen in [`../DEPLOY.md`](../DEPLOY.md).
