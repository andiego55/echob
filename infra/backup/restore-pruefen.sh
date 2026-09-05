#!/usr/bin/env bash
#
# EchoB — beweist, dass ein Backup zurückkommt. Läuft auf DEINEM Rechner, nicht auf dem Server.
#
#   restore-pruefen.sh <backup.sql.gz.age> <age-schluesseldatei> [<encryption-key-datei>]
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
FERNET="${3:-}"   # optional: Datei mit dem ENCRYPTION_KEY
if [ -z "$DATEI" ] || [ -z "$SCHLUESSEL" ]; then
  cat >&2 <<'HINWEIS'
Aufruf: restore-pruefen.sh <backup.sql.gz.age> <age-schluesseldatei> [<encryption-key-datei>]

  <backup.sql.gz.age>    vom Server geholt:
      scp root@<SERVER-IP>:/var/backups/echob/echob-JJJJ-MM-TT_HHMM.sql.gz.age .

  <age-schluesseldatei>  Textdatei mit der Zeile AGE-SECRET-KEY-1...
      Aus dem Passwortmanager in eine temporaere Datei schreiben und danach loeschen.

  <encryption-key-datei> OPTIONAL. Textdatei mit dem ENCRYPTION_KEY (44 Zeichen, endet
      auf '='). Damit wird zusaetzlich geprueft, ob die zurueckgespielten Daten auch
      LESBAR sind - siehe "Warum die Leseprobe" oben.
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
# ── Leseprobe: sind die Daten auch LESBAR? ───────────────────────────────────
#
# WARUM DAS NOETIG IST. Bis hierher ist bewiesen, dass Zeilen zurueckkommen - nicht, dass
# man sie noch verstehen kann. Szenentexte, Dokumente, Artefakte und Echo-Nachrichten
# liegen Fernet-verschluesselt in der Datenbank (siehe app/core/crypto.py). Waere der
# ENCRYPTION_KEY verloren, liefe dieser Test bis hierher durch und meldete Erfolg, waehrend
# die Daten praktisch weg waeren. Der Schluessel ist damit genauso ueberlebenswichtig wie
# der age-Schluessel - und ohne diese Probe sagt der Beweis nichts ueber ihn.
#
# WARUM DER KLARTEXT NICHT ANGEZEIGT WIRD. Was hier entschluesselt wird, ist eine echte
# Nachricht aus einem Beziehungsdialog - Art.-9-Daten. Bewiesen ist die Lesbarkeit auch
# ohne sie: Wenn Fernet den Token annimmt, stimmen Schluessel UND Signatur. Ausgegeben wird
# deshalb nur, DASS es ging und wie lang der Klartext war.
if [ -n "$FERNET" ]; then
  sagen ""
  if [ ! -f "$FERNET" ]; then
    sagen "FEHLGESCHLAGEN: Schluesseldatei '$FERNET' gibt es nicht."
    exit 1
  fi
  if ! command -v python >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
    sagen "UEBERSPRUNGEN: Fuer die Leseprobe wird Python mit 'cryptography' gebraucht."
  else
    PY_BIN="$(command -v python3 || command -v python)"
    token="$(frage "SELECT content FROM echo_messages WHERE content LIKE 'gAAAAA%' ORDER BY created_at DESC LIMIT 1")"
    if [ -z "$token" ]; then
      # Auch das ist ein Befund, kein Fehler des Skripts.
      sagen "ACHTUNG: Keine verschluesselte Nachricht gefunden - liegen die Daten im Klartext?"
    else
      laenge="$(printf '%s' "$token" | "$PY_BIN" -c '
import sys
from cryptography.fernet import Fernet
schluessel = open(sys.argv[1], encoding="utf-8").read().strip()
token = sys.stdin.read().strip()
try:
    print(len(Fernet(schluessel.encode()).decrypt(token.encode()).decode()))
except Exception:
    print("-1")
' "$FERNET" 2>/dev/null)"
      if [ "${laenge:--1}" -gt 0 ] 2>/dev/null; then
        sagen "Leseprobe: entschluesselt, $laenge Zeichen Klartext (Inhalt bewusst nicht angezeigt)."
      else
        sagen "FEHLGESCHLAGEN: Der ENCRYPTION_KEY passt nicht zu diesen Daten."
        sagen "  Die Zeilen sind zwar da, aber unlesbar. Pruefe, ob es der Schluessel ist,"
        sagen "  der zum Zeitpunkt des Backups in .env.docker stand."
        exit 1
      fi
    fi
  fi
fi

if [ -n "$FERNET" ]; then
  sagen "BEWIESEN: Das Backup laesst sich entschluesseln, zurueckspielen, enthaelt Daten - und die Daten sind lesbar."
else
  sagen "BEWIESEN: Das Backup laesst sich entschluesseln, zurueckspielen und enthaelt Daten."
  sagen "(Ob die Daten LESBAR sind, sagt das nicht - dafuer den ENCRYPTION_KEY als drittes Argument mitgeben.)"
fi
sagen ""
sagen "Bitte noch erledigen:"
sagen "  1. Auf dem Server vermerken, damit der Waechter Ruhe gibt:"
sagen "     ssh root@<SERVER-IP> 'date +%s > /var/backups/echob/.restore-test-ok'"
sagen "  2. Die heruntergeladene Datei loeschen - sie enthaelt echte Nutzerdaten:"
sagen "     rm -f \"$DATEI\""
sagen "  3. Die temporaere Schluesseldatei loeschen:"
sagen "     rm -f \"$SCHLUESSEL\""
exit 0
