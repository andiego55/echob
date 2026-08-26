#!/usr/bin/env bash
#
# EchoB — spielt das jüngste Backup in eine Wegwerf-Datenbank zurück und prüft, ob wirklich
# Daten drin sind. Danach wird die Wegwerf-Datenbank wieder gelöscht.
#
# WARUM. Ein Backup, das nie zurückgespielt wurde, ist eine Vermutung. Die Datei kann da
# sein, die richtige Größe haben, sich sogar entschlüsseln lassen — und trotzdem beim
# `pg_restore` scheitern oder eine leere Hülle enthalten. Das merkt man normalerweise an dem
# einen Tag, an dem es darauf ankommt. Deshalb läuft der Beweis wöchentlich von selbst,
# statt als Vorsatz in einer README zu stehen.
#
# WAS ALS BEWEIS GILT. Nicht der Rückgabewert von `pg_restore` — der meldet auch bei
# harmlosen Warnungen einen Fehler. Bewiesen ist es, wenn die zurückgespielte Datenbank die
# erwarteten Tabellen hat und die Kerntabellen Zeilen enthalten. Zusätzlich wird das jüngste
# Datum gemeldet: Es sagt, WIE ALT die Daten im Backup sind — eine Datei von heute Nacht mit
# Daten von vor drei Wochen wäre der stillste aller Fehler.
#
# SICHERHEIT GEGEN DAS SCHLIMMSTE. Ein Wiederherstellungs-Test, der versehentlich die
# Produktionsdatenbank überschreibt, wäre genau die Katastrophe, die er verhindern soll.
# Drei Sperren: der Zielname ist fest verdrahtet, er wird gegen den Produktionsnamen
# geprüft, und es wird NIE mit `--clean` gearbeitet.
#
# UND GEGEN DIE ZWEITE KATASTROPHE. Ein Restore verdoppelt die Daten kurzzeitig auf der
# Platte. Auf einer knappen Platte würde ausgerechnet die Sicherheitsprüfung den Ausfall
# auslösen. Deshalb wird vorher gerechnet und im Zweifel abgebrochen.
#
# Aufruf: /opt/echob/backup/restore-test.sh   (wöchentlich per Cron)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

COMPOSE_DIR="${ECHOB_DIR:-/opt/echob}"
COMPOSE_FILE="${ECHOB_COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${ECHOB_BACKUP_DIR:-$COMPOSE_DIR/backups}"
PASS_FILE="${ECHOB_PASS_FILE:-$COMPOSE_DIR/backup/.backup_passphrase}"
ALARM="${ECHOB_ALARM:-$COMPOSE_DIR/monitor/alarm.sh}"
STATUS_DATEI="$BACKUP_DIR/.restore-test-ok"

# Der Weg zu Postgres ist austauschbar - nicht aus Flexibilitaetsliebe, sondern damit
# dieses Skript selbst pruefbar ist. Ein ungepruefter Beweis ist so wenig wert wie ein
# ungeprueftes Backup; mit ECHOB_PG_EXEC laeuft der ganze Ablauf gegen einen beliebigen
# Wegwerf-Container.
PG_EXEC="${ECHOB_PG_EXEC:-}"

DB_USER="${ECHOB_DB_USER:-echob}"
DB_NAME="${ECHOB_DB_NAME:-echob}"
TEST_DB="echob_restore_test"

# Diese Tabellen müssen da sein UND Zeilen haben. Sie decken die drei Bereiche ab: Konto,
# Fall, Gespräch. Fehlt eine, ist das Backup unvollständig, auch wenn der Restore "lief".
KERNTABELLEN="user_profiles cases echo_messages"

meldung=""
sagen() { echo "$*"; meldung+="$*"$'\n'; }

pg() {
  if [ -n "$PG_EXEC" ]; then
    $PG_EXEC "$@"
  else
    docker compose -f "$COMPOSE_FILE" exec -T postgres "$@"
  fi
}
frage() { pg psql -U "$DB_USER" -d "$1" -tAc "$2" 2>/dev/null | tr -d '\r'; }

scheitern() {
  sagen ""
  sagen "ERGEBNIS: Der Wiederherstellungs-Test ist FEHLGESCHLAGEN."
  sagen "Das Backup ist damit unbewiesen. Bitte von Hand nachsehen:"
  sagen "  $BACKUP_DIR"
  [ -x "$ALARM" ] && "$ALARM" "Backup laesst sich NICHT zurueckspielen" "$meldung"
  aufraeumen
  exit 1
}

aufraeumen() {
  # Immer, auch bei Abbruch: Die Wegwerf-Datenbank darf nicht liegen bleiben, sonst frisst
  # sie beim naechsten Lauf noch einmal denselben Platz.
  if [ "$TEST_DB" != "$DB_NAME" ]; then
    pg dropdb -U "$DB_USER" --if-exists "$TEST_DB" >/dev/null 2>&1 || true
  fi
}
trap aufraeumen EXIT INT TERM

# ── Sperre 1: niemals auf die Produktionsdatenbank ───────────────────────────
if [ "$TEST_DB" = "$DB_NAME" ]; then
  sagen "ABBRUCH: Test-Ziel und Produktionsdatenbank tragen denselben Namen ($DB_NAME)."
  scheitern
fi

cd "$COMPOSE_DIR" || { echo "ABBRUCH: $COMPOSE_DIR nicht erreichbar" >&2; exit 1; }

sagen "Wiederherstellungs-Test $(date '+%Y-%m-%d %H:%M')"
sagen "Rechner: $(hostname)"
sagen ""

# ── Das jüngste Backup finden ────────────────────────────────────────────────
DUMP="$(ls -1t "$BACKUP_DIR"/echob-*.dump.enc 2>/dev/null | head -1)"
if [ -z "$DUMP" ]; then
  sagen "ABBRUCH: In $BACKUP_DIR liegt gar kein Backup."
  scheitern
fi
alter_std=$(( ( $(date +%s) - $(stat -c %Y "$DUMP") ) / 3600 ))
sagen "Datei:  $(basename "$DUMP")  ($(du -h "$DUMP" | cut -f1), $alter_std Std. alt)"

if [ ! -s "$PASS_FILE" ]; then
  sagen "ABBRUCH: Passphrase-Datei fehlt oder ist leer: $PASS_FILE"
  scheitern
fi

# ── Sperre 2: reicht der Platz? ──────────────────────────────────────────────
# Die zurückgespielte Datenbank wird etwa so groß wie die produktive. Dazu ein Puffer,
# damit der Test nicht selbst zur Ursache eines vollen Datenträgers wird.
db_bytes="$(frage "$DB_NAME" "SELECT pg_database_size('$DB_NAME')")"
frei_bytes=$(( $(df -P "$COMPOSE_DIR" | awk 'NR==2 {print $4}') * 1024 ))
if [ -n "$db_bytes" ]; then
  noetig=$(( db_bytes * 13 / 10 + 500 * 1024 * 1024 ))
  sagen "Platz:  $(( frei_bytes / 1024 / 1024 )) MB frei, $(( noetig / 1024 / 1024 )) MB noetig"
  if [ "$frei_bytes" -lt "$noetig" ]; then
    sagen ""
    sagen "ABBRUCH: Zu wenig Platz fuer einen gefahrlosen Test."
    sagen "Das ist KEIN Backup-Fehler, aber ein dringender Hinweis: Wenn hier der Platz"
    sagen "nicht reicht, reicht er bald auch fuer die Datenbank selbst nicht mehr."
    scheitern
  fi
else
  sagen "Platz:  Groesse der Produktionsdatenbank nicht ermittelbar - Test trotzdem versucht."
fi

# ── Zurückspielen ────────────────────────────────────────────────────────────
aufraeumen   # Reste eines abgebrochenen Vorlaufs
if ! pg createdb -U "$DB_USER" "$TEST_DB" >/dev/null 2>&1; then
  sagen "ABBRUCH: Wegwerf-Datenbank $TEST_DB liess sich nicht anlegen."
  scheitern
fi

fehler_datei="$(mktemp)"
openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$PASS_FILE" -in "$DUMP" \
  | pg pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner --no-privileges \
  2>"$fehler_datei"
restore_rc=$?
# grep -c gibt bei null Treffern "0" aus UND Exitcode 1 - ein "|| echo 0" schriebe
# die Null deshalb ein zweites Mal in die Ausgabe.
fehler_zeilen="$(grep -c . "$fehler_datei" 2>/dev/null)"
fehler_zeilen="${fehler_zeilen:-0}"
rm -f "$fehler_datei"

# ── Der eigentliche Beweis: sind Daten da? ───────────────────────────────────
tabellen="$(frage "$TEST_DB" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
tabellen="${tabellen:-0}"
sagen "Tabellen zurueckgespielt: $tabellen  (pg_restore rc=$restore_rc, $fehler_zeilen Meldungen)"

if [ "$tabellen" -lt 20 ]; then
  sagen ""
  sagen "Das sind zu wenige Tabellen - das Backup ist nicht vollstaendig."
  scheitern
fi

fehlend=""
for t in $KERNTABELLEN; do
  n="$(frage "$TEST_DB" "SELECT count(*) FROM $t")"
  if [ -z "$n" ]; then
    sagen "  $t: TABELLE FEHLT"
    fehlend="$fehlend $t"
  else
    sagen "  $t: $n Zeilen"
    [ "$n" = "0" ] && fehlend="$fehlend $t(leer)"
  fi
done

if [ -n "$fehlend" ]; then
  sagen ""
  sagen "Kerntabellen fehlen oder sind leer:$fehlend"
  scheitern
fi

# Wie frisch sind die Daten? Eine Datei von heute Nacht mit Daten von vor drei Wochen
# waere der stillste aller Fehler.
juengste="$(frage "$TEST_DB" "SELECT max(created_at)::text FROM echo_messages")"
sagen ""
sagen "Juengste Nachricht im Backup: ${juengste:-unbekannt}"

sagen ""
sagen "ERGEBNIS: Das Backup laesst sich zurueckspielen und enthaelt Daten."
date +%s > "$STATUS_DATEI"
exit 0
