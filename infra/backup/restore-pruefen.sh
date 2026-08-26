#!/usr/bin/env bash
#
# EchoB — beweist, dass ein Backup zurückkommt. Läuft auf DEINEM Rechner, nicht auf dem Server.
#
#   restore-pruefen.sh <backup.sql.gz.age> <age-schluesseldatei>
#
# WARUM NICHT AUF DEM SERVER. Das Backup ist mit `age` gegen einen öffentlichen Schlüssel
# verschlüsselt; der private liegt bewusst nicht auf der Maschine. Ein automatischer Test
# dort bräuchte ihn — und würde genau die Eigenschaft zerstören, die das Backup wertvoll
# macht: dass ein übernommener Server die Backups nicht aufbekommt.
#
# Der Beweis gehört deshalb dorthin, wo der Schlüssel ohnehin ist. Nebenbei entsteht dabei
# die erste Kopie außer Haus.
#
# WAS ALS BEWEIS GILT. Nicht, dass `psql` ohne Fehler durchlief — bei einem SQL-Dump laufen
# fast immer harmlose Meldungen mit. Bewiesen ist es, wenn die Datenbank die erwarteten
# Tabellen hat UND die Kerntabellen Zeilen enthalten. Gegengeprüft mit vier Schadensbildern;
# der lehrreichste war ein Restore, der sauber durchlief, während eine Kerntabelle leer war.
#
# WAS GEPRÜFT WIRD, PASSIERT IN EINEM WEGWERF-CONTAINER. Kein Postgres auf deinem Rechner
# nötig, und nichts bleibt zurück: Der Container wird am Ende entfernt, auch bei Abbruch.
#
# ACHTUNG: Zwischen Entschlüsseln und Aufräumen liegen echte Nutzerdaten (Art.-9-Daten) im
# Container. Deshalb löscht das Skript ihn immer selbst — und die heruntergeladene Datei
# gehört danach ebenfalls gelöscht.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

DATEI="${1:-}"
SCHLUESSEL="${2:-}"
if [ -z "$DATEI" ] || [ -z "$SCHLUESSEL" ]; then
  cat >&2 <<'HINWEIS'
Aufruf: restore-pruefen.sh <backup.sql.gz.age> <age-schluesseldatei>

  <backup.sql.gz.age>    vom Server geholt:
      scp root@<SERVER-IP>:/var/backups/echob/echob-JJJJ-MM-TT_HHMM.sql.gz.age .

  <age-schluesseldatei>  Textdatei mit der Zeile AGE-SECRET-KEY-1...
      Aus dem Passwortmanager in eine temporaere Datei schreiben und danach loeschen.
HINWEIS
  exit 2
fi

CONTAINER="echob-restore-probe"
TEST_DB="echob_restore_test"
PW="probe-$$"
KERNTABELLEN="user_profiles cases echo_messages"

sagen() { echo "$*"; }

aufraeumen() {
  # Immer: In dem Container liegen echte Nutzerdaten. Er darf nicht stehen bleiben.
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap aufraeumen EXIT INT TERM

for werkzeug in docker age gunzip; do
  command -v "$werkzeug" >/dev/null 2>&1 || {
    sagen "ABBRUCH: '$werkzeug' ist nicht installiert."; exit 1; }
done
[ -s "$DATEI" ]       || { sagen "ABBRUCH: $DATEI fehlt oder ist leer."; exit 1; }
[ -s "$SCHLUESSEL" ]  || { sagen "ABBRUCH: $SCHLUESSEL fehlt oder ist leer."; exit 1; }

sagen "Wiederherstellungs-Beweis $(date '+%Y-%m-%d %H:%M')"
sagen "Datei: $(basename "$DATEI") ($(du -h "$DATEI" | cut -f1))"
sagen ""

# ── Erst entschlüsseln, bevor irgendetwas hochgefahren wird ──────────────────
# Scheitert das, liegt es am Schluessel - und dann muss man keinen Container starten.
KLARTEXT="$(mktemp)"
if ! age -d -i "$SCHLUESSEL" "$DATEI" 2>/dev/null | gunzip > "$KLARTEXT" 2>/dev/null; then
  rm -f "$KLARTEXT"
  sagen "FEHLGESCHLAGEN: Die Datei laesst sich mit diesem Schluessel nicht entschluesseln."
  sagen "Entweder passt der Schluessel nicht, oder die Datei ist beschaedigt."
  exit 1
fi
zeilen_sql="$(wc -l < "$KLARTEXT")"
sagen "Entschluesselt: $zeilen_sql Zeilen SQL ($(du -h "$KLARTEXT" | cut -f1))"

# ── Wegwerf-Postgres ─────────────────────────────────────────────────────────
aufraeumen
docker run --rm -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PW" \
  postgres:16-alpine >/dev/null 2>&1 || {
  rm -f "$KLARTEXT"; sagen "ABBRUCH: Wegwerf-Container liess sich nicht starten."; exit 1; }

pg() { docker exec -i -e PGPASSWORD="$PW" "$CONTAINER" "$@"; }

printf 'Warte auf Postgres '
for _ in $(seq 1 30); do
  pg pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
pg pg_isready -U postgres >/dev/null 2>&1 || {
  rm -f "$KLARTEXT"; sagen "ABBRUCH: Postgres im Container wurde nicht bereit."; exit 1; }
sagen "- bereit"

# Den Eigentuemer aus dem Dump lesen und anlegen. Sonst scheitert jedes "OWNER TO ..." -
# harmlos fuer die Daten, aber es erzeugt eine Meldung je Tabelle und macht die Zahl weiter
# unten wertlos. Der Name wird gelesen statt geraten, damit es auch stimmt, wenn der
# Datenbanknutzer einmal anders heisst.
besitzer="$(grep -m1 -oE 'OWNER TO [A-Za-z0-9_]+' "$KLARTEXT" | awk '{print $3}')"
if [ -n "${besitzer:-}" ]; then
  pg psql -U postgres -q -c "CREATE ROLE \"$besitzer\" LOGIN SUPERUSER" >/dev/null 2>&1 || true
fi
pg createdb -U postgres "$TEST_DB" >/dev/null 2>&1

# ── Zurückspielen ────────────────────────────────────────────────────────────
fehler="$(mktemp)"
pg psql -U postgres -d "$TEST_DB" -q < "$KLARTEXT" 2>"$fehler" >/dev/null
meldungen="$(grep -c . "$fehler" 2>/dev/null)"; meldungen="${meldungen:-0}"
rm -f "$KLARTEXT"

frage() { pg psql -U postgres -d "$TEST_DB" -tAc "$1" 2>/dev/null | tr -d '\r'; }

tabellen="$(frage "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
tabellen="${tabellen:-0}"
sagen "Tabellen zurueckgespielt: $tabellen  ($meldungen Meldungen beim Einspielen)"

if [ "$tabellen" -lt 20 ]; then
  sagen ""
  sagen "FEHLGESCHLAGEN: Zu wenige Tabellen - das Backup ist nicht vollstaendig."
  sagen "Erste Meldungen:"; head -5 "$fehler"; rm -f "$fehler"
  exit 1
fi
rm -f "$fehler"

fehlend=""
for t in $KERNTABELLEN; do
  n="$(frage "SELECT count(*) FROM $t")"
  if [ -z "$n" ]; then sagen "  $t: TABELLE FEHLT"; fehlend="$fehlend $t"
  else sagen "  $t: $n Zeilen"; [ "$n" = "0" ] && fehlend="$fehlend $t(leer)"; fi
done

if [ -n "$fehlend" ]; then
  sagen ""
  sagen "FEHLGESCHLAGEN: Kerntabellen fehlen oder sind leer:$fehlend"
  exit 1
fi

# Wie frisch sind die Daten? Eine Datei von heute Nacht mit Daten von vor drei Wochen waere
# der stillste aller Fehler.
sagen ""
sagen "Juengste Nachricht im Backup: $(frage "SELECT max(created_at)::text FROM echo_messages")"
sagen ""
sagen "BEWIESEN: Das Backup laesst sich entschluesseln, zurueckspielen und enthaelt Daten."
sagen ""
sagen "Bitte noch erledigen:"
sagen "  1. Auf dem Server vermerken, damit der Waechter Ruhe gibt:"
sagen "     ssh root@<SERVER-IP> 'date +%s > /var/backups/echob/.restore-test-ok'"
sagen "  2. Die heruntergeladene Datei loeschen - sie enthaelt echte Nutzerdaten:"
sagen "     rm -f \"$DATEI\""
sagen "  3. Die temporaere Schluesseldatei loeschen:"
sagen "     rm -f \"$SCHLUESSEL\""
exit 0
