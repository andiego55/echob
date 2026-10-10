#!/usr/bin/env bash
#
# EchoB — kommt ein Alarm wirklich an?
#
# WARUM ES DIESE DATEI GIBT. Am 10.10.2026 stellte sich heraus, dass die Alarmleitung
# seit ihrem Bau **keine einzige Mail zugestellt** hatte. Der Grund war eine
# Reihenfolge: `EMPFAENGER` wurde elf Zeilen vor dem Einlesen der `.env.docker`
# gesetzt und war deshalb immer leer. Schluessel und Absender standen danach und
# funktionierten — die Datei sah beim Lesen vollstaendig aus.
#
# Aufgefallen ist es nicht beim Lesen des Codes, sondern beim Blick ins
# Alarmprotokoll: dort stand unter jeder Warnung "niemand wird benachrichtigt".
#
# **Ein Skript, das durchlaeuft, ist kein zugestellter Alarm.** Das hier loest einen
# echten aus und sagt, was dabei herauskam. Nach jeder Aenderung an alarm.sh, nach
# jedem Wechsel des Resend-Schluessels und nach jedem Umzug der .env.docker.
#
# Aufruf:  /opt/echob/infra/monitor/probe-zustellung.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALARM="${ECHOB_ALARM:-$HIER/alarm.sh}"
LOG="${ALARM_LOG:-/var/log/echob-alarm.log}"

echo "Loese einen Probe-Alarm aus ..."
vorher=0
[ -f "$LOG" ] && vorher="$(grep -c 'zugestellt an' "$LOG" 2>/dev/null || echo 0)"

"$ALARM" "Probe-Alarm" "Das ist eine Zustellprobe, kein Vorfall.

Wenn diese Mail ankommt, funktioniert die Alarmleitung: Der Waechter kann dich
erreichen, wenn die Platte volllaeuft, das Backup ausbleibt, die API nicht mehr
antwortet oder Serverfehler auftreten.

Ausgeloest von Hand ueber infra/monitor/probe-zustellung.sh."
ergebnis=$?

nachher=0
[ -f "$LOG" ] && nachher="$(grep -c 'zugestellt an' "$LOG" 2>/dev/null || echo 0)"

echo
if [ "$ergebnis" -eq 0 ] && [ "$nachher" -gt "$vorher" ]; then
  echo "ZUGESTELLT. Sieh im Postfach nach - Betreff beginnt mit [EchoB/<rechner>]."
  echo "Kommt dort nichts an, liegt es nicht mehr am Server, sondern an Resend,"
  echo "am Spamfilter oder an der Adresse."
  exit 0
fi

echo "NICHT ZUGESTELLT. Der Grund steht in der letzten Zeile des Protokolls:"
echo
tail -3 "$LOG" 2>/dev/null || echo "(kein Protokoll unter $LOG)"
echo
echo "Die drei haeufigsten Ursachen:"
echo "  - ALARM_TO_EMAIL fehlt in der .env.docker oder wird zu frueh gelesen"
echo "  - RESEND_API_KEY fehlt oder ist abgelaufen"
echo "  - die Absenderadresse liegt nicht auf der bei Resend verifizierten Domain"
exit 1
