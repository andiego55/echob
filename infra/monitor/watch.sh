#!/usr/bin/env bash
#
# EchoB — der Wächter. Läuft alle vier Stunden und schlägt an, bevor etwas ausfällt.
#
# WAS ER PRÜFT, UND WARUM GENAU DAS:
#
#   Platte      Der einzige Posten, der unbemerkt und unbegrenzt wächst. Ist sie voll,
#               hört Postgres auf zu schreiben UND das Backup schlägt fehl — die beiden
#               schlimmsten Fälle treffen gleichzeitig ein.
#   Backup      Ein Backup, das seit zwei Tagen nicht mehr lief, ist kein Backup. Geprüft
#               wird die DATEI, nicht ein Erfolgsvermerk: Was zählt, ist, dass etwas da ist.
#   Restore     Wann wurde zuletzt bewiesen, dass sich das Backup zurückspielen lässt?
#   API         Ein Container kann laufen und trotzdem nichts mehr beantworten.
#               restart: unless-stopped startet so einen nie neu, weil er ja „läuft".
#
# WARUM NUR BEI ÄNDERUNG GEMELDET WIRD. Eine Warnung, die alle vier Stunden kommt, wird
# nach dem dritten Mal weggeklickt — und dann auch die vierte, die echt war. Gemeldet wird
# deshalb nur der ÜBERGANG: ok → knapp, knapp → kritisch, und die Entwarnung zurück.
#
# WARUM ES TROTZDEM EINEN WOCHENBERICHT GIBT. Stille ist zweideutig: Sie kann „alles in
# Ordnung" heißen oder „der Wächter läuft seit drei Wochen nicht mehr". Einmal pro Woche
# eine Zeile mit den nackten Zahlen löst das auf.
#
# Aufruf: /opt/echob/infra/monitor/watch.sh    (alle 4 Std. per Cron)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

ECHOB_DIR="${ECHOB_DIR:-/opt/echob}"
# Dorthin schreibt das Backup wirklich - nicht nach /opt/echob/backups.
BACKUP_DIR="${ECHOB_BACKUP_DIR:-/var/backups/echob}"
ALARM="${ECHOB_ALARM:-$ECHOB_DIR/infra/monitor/alarm.sh}"
ZUSTAND_DIR="${ECHOB_STATE_DIR:-$BACKUP_DIR/.watch}"
# Ueber die oeffentliche Adresse, nicht ueber 127.0.0.1: Der api-Container
# veroeffentlicht gar keinen Host-Port, nur caddy hat 80/443. Der Umweg prueft
# zusaetzlich DNS, Zertifikat und Proxy - also die Kette, die der Nutzer erlebt.
# Faellt das Netz nach draussen aus, kann auch keine Alarmmail raus: kein Fehlalarm.
API_URL="${ECHOB_API_URL:-https://api.echo-b.de/api/v1/health}"

# Absolute Grenzen, keine Prozente: Bei 40 GB Platte sind „10 % frei" noch 4 GB, bei 400 GB
# wären es 40. Was zählt, ist, wie viele Gigabyte bis zum Stillstand bleiben.
PLATTE_KNAPP_GB="${ECHOB_DISK_WARN_GB:-3}"
PLATTE_KRITISCH_GB="${ECHOB_DISK_CRIT_GB:-1.5}"
BACKUP_MAX_STD="${ECHOB_BACKUP_MAX_H:-36}"      # täglich um 03:30 → 36 Std. = zwei verpasst
RESTORE_MAX_TAGE="${ECHOB_RESTORE_MAX_D:-45}"   # der Beweis laeuft von Hand, monatlich reicht
BERICHT_ALLE_TAGE="${ECHOB_REPORT_EVERY_D:-7}"

mkdir -p "$ZUSTAND_DIR" 2>/dev/null || true

bericht=""
notiz() { bericht+="$*"$'\n'; echo "$*"; }

melden() { [ -x "$ALARM" ] && "$ALARM" "$1" "$2"; }

# Meldet nur den Übergang. `pruefe NAME ZUSTAND TEXT` — ZUSTAND ist ok|warn|kritisch.
pruefe() {
  local name="$1" jetzt="$2" text="$3"
  local datei="$ZUSTAND_DIR/$name"
  local vorher="ok"
  [ -f "$datei" ] && vorher="$(cat "$datei" 2>/dev/null)"
  echo "$jetzt" > "$datei" 2>/dev/null || true

  [ "$jetzt" = "$vorher" ] && return 0
  case "$jetzt" in
    kritisch) melden "KRITISCH: $name" "$text" ;;
    warn)     melden "Achtung: $name"  "$text" ;;
    ok)       melden "Entwarnung: $name" "Wieder im gruenen Bereich."$'\n\n'"$text" ;;
  esac
}

notiz "EchoB-Waechter $(date '+%Y-%m-%d %H:%M')"
notiz ""

# ── Platte ───────────────────────────────────────────────────────────────────
frei_kb="$(df -P "$ECHOB_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "${frei_kb:-}" ]; then
  frei_mb=$(( frei_kb / 1024 ))
  # Schwellen in MB, damit ganzzahlig gerechnet werden kann (1.5 GB → 1536 MB).
  knapp_mb=$(  awk -v g="$PLATTE_KNAPP_GB"    'BEGIN{printf "%d", g*1024}')
  krit_mb=$(   awk -v g="$PLATTE_KRITISCH_GB" 'BEGIN{printf "%d", g*1024}')
  notiz "Platte:   $(( frei_mb / 1024 )).$(( (frei_mb % 1024) * 10 / 1024 )) GB frei"

  if   [ "$frei_mb" -lt "$krit_mb" ]; then
    pruefe platte kritisch \
      "Nur noch $frei_mb MB frei (Grenze $krit_mb MB).

Wenn die Platte voll laeuft, hoert Postgres auf zu schreiben UND das Backup schlaegt fehl.
Sofort Platz schaffen:

  docker image prune -af && docker builder prune -af
  du -sh /opt/echob/backups /var/lib/docker /var/log | sort -h"
  elif [ "$frei_mb" -lt "$knapp_mb" ]; then
    pruefe platte warn \
      "Noch $frei_mb MB frei (Grenze $knapp_mb MB). Kein Notfall, aber es wird eng.
Aufraeumen: docker image prune -af && docker builder prune -af"
  else
    pruefe platte ok "$frei_mb MB frei."
  fi
else
  notiz "Platte:   nicht ermittelbar"
fi

# ── Backup: die Datei zaehlt, nicht der Vermerk ──────────────────────────────
juengstes="$(ls -1t "$BACKUP_DIR"/echob-*.sql.gz.age 2>/dev/null | head -1)"
if [ -z "$juengstes" ]; then
  notiz "Backup:   KEINES vorhanden"
  pruefe backup kritisch \
    "In $BACKUP_DIR liegt kein einziges Backup.
Entweder lief das Skript nie oder die Rotation hat alles geloescht."
else
  alter_std=$(( ( $(date +%s) - $(stat -c %Y "$juengstes") ) / 3600 ))
  notiz "Backup:   $alter_std Std. alt ($(basename "$juengstes"))"
  if [ "$alter_std" -gt "$BACKUP_MAX_STD" ]; then
    pruefe backup kritisch \
      "Das juengste Backup ist $alter_std Stunden alt (Grenze $BACKUP_MAX_STD).
Datei: $juengstes

Der taegliche Lauf kommt nicht mehr durch. Nachsehen:
  tail -30 /var/log/echob-backup.log
  tail -30 /opt/echob/backups/alarm.log"
  else
    pruefe backup ok "Juengstes Backup ist $alter_std Std. alt."
  fi
fi

# ── Wann wurde zuletzt bewiesen, dass es zurueckkommt? ───────────────────────
status="$BACKUP_DIR/.restore-test-ok"
if [ -f "$status" ]; then
  tage=$(( ( $(date +%s) - $(cat "$status" 2>/dev/null || echo 0) ) / 86400 ))
  notiz "Restore:  zuletzt vor $tage Tagen bewiesen"
  if [ "$tage" -gt "$RESTORE_MAX_TAGE" ]; then
    pruefe restore warn \
      "Der Wiederherstellungs-Beweis ist $tage Tage alt.

Er laeuft NICHT auf dem Server: Das Backup ist asymmetrisch verschluesselt, der private
Schluessel gehoert nicht hierher. Auf deinem Rechner:
  infra/backup/restore-pruefen.sh <backup.sql.gz.age> <schluesseldatei>"
  else
    pruefe restore ok "Zuletzt vor $tage Tagen bewiesen."
  fi
else
  notiz "Restore:  noch nie gelaufen"
  pruefe restore warn \
    "Es gibt noch keinen Wiederherstellungs-Beweis.

Ein Backup, das nie zurueckgespielt wurde, ist eine Vermutung. Auf deinem Rechner:
  infra/backup/restore-pruefen.sh <backup.sql.gz.age> <schluesseldatei>"
fi

# ── API: laeuft sie noch, oder laeuft sie nur? ───────────────────────────────
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$API_URL" 2>/dev/null)"
notiz "API:      HTTP ${code:-keine Antwort}"
if [ "$code" = "200" ]; then
  pruefe api ok "Antwortet wieder."
else
  pruefe api kritisch \
    "Die API antwortet nicht ($API_URL, HTTP ${code:-keine Antwort}).

Ein Container kann laufen und trotzdem nichts mehr beantworten - restart: unless-stopped
startet so einen nie neu, weil er ja laeuft. Nachsehen:
  docker compose -f /opt/echob/docker-compose.prod.yml ps
  docker compose -f /opt/echob/docker-compose.prod.yml logs --tail=80 api"
fi

# ── Wochenbericht: Stille ist zweideutig ─────────────────────────────────────
bericht_datei="$ZUSTAND_DIR/.letzter-bericht"
letzter=0
[ -f "$bericht_datei" ] && letzter="$(cat "$bericht_datei" 2>/dev/null || echo 0)"
if [ $(( ( $(date +%s) - letzter ) / 86400 )) -ge "$BERICHT_ALLE_TAGE" ]; then
  melden "Wochenbericht" "$bericht"$'\n'"(Diese Mail kommt einmal pro Woche, damit du weisst, dass der Waechter laeuft.)"
  date +%s > "$bericht_datei" 2>/dev/null || true
fi

exit 0
