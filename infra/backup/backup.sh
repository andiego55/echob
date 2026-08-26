#!/usr/bin/env bash
#
# EchoB — täglicher Postgres-Backup, asymmetrisch verschlüsselt.
#
#   pg_dump → gzip → age (öffentlicher Schlüssel) → /var/backups/echob/
#
# HERKUNFT. Dieses Skript lief bereits monatelang unversioniert unter /root/echob-backup.sh
# und hat dort zuverlässig gearbeitet. Es steht jetzt hier, weil ein Backup-Skript, das nur
# auf dem Server existiert, mit dem Server stirbt — und weil niemand nachvollziehen kann,
# was es tut. Der Kern ist unverändert übernommen; ergänzt wurden nur Alarm und Kommentare.
#
# WARUM `age` UND NICHT `openssl enc`. `age -r` verschlüsselt gegen einen ÖFFENTLICHEN
# Schlüssel. Der private liegt nicht auf dem Server: Wer die Maschine übernimmt, bekommt die
# Backups nicht auf. Eine symmetrische Passphrase neben den Dateien hätte diese Eigenschaft
# nicht — dieses Skript ist der symmetrischen Variante deshalb überlegen und hat sie ersetzt.
#
# DER PREIS DIESER STÄRKE. Ein automatischer Wiederherstellungs-Test kann hier NICHT laufen:
# Er bräuchte den privaten Schlüssel auf dem Server und würde genau die Eigenschaft zerstören,
# die das Backup wertvoll macht. Der Beweis gehört dorthin, wo der Schlüssel ist — siehe
# `restore-pruefen.sh` und README.
#
# WAS NEU IST: der Alarm. Vorher schrieb ein Fehlschlag „FAIL" in eine Logdatei, die niemand
# liest. Ein Backup, das lautlos aufhört zu laufen, merkt man an dem Tag, an dem man es
# braucht.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Der ÖFFENTLICHE Schlüssel — kein Geheimnis. Er kann nur verschlüsseln, nicht entschlüsseln.
# Der private gehört in den Passwortmanager und NIE auf diesen Server.
RECIPIENT="${ECHOB_AGE_RECIPIENT:-age1ky3m6nhgf3aff43l7cp7gy4ys23zykkfr7u99wj333rrzymjkqks76l96s}"

BACKUP_DIR="${ECHOB_BACKUP_DIR:-/var/backups/echob}"
COMPOSE="docker compose -f ${ECHOB_DIR:-/opt/echob}/docker-compose.prod.yml"
KEEP_DAYS="${ECHOB_KEEP_DAYS:-14}"
ALARM="${ECHOB_ALARM:-/opt/echob/infra/monitor/alarm.sh}"
LOG="${ECHOB_BACKUP_LOG:-/var/log/echob-backup.log}"

# stderr mitschneiden, damit im Alarm der ECHTE Fehler steht und nicht nur „fehlgeschlagen".
# fd 3 hält den ursprünglichen Kanal fest, damit das Cron-Log am Ende trotzdem alles sieht.
FEHLERSCHNITT="$(mktemp)"
exec 3>&2
exec 2>"$FEHLERSCHNITT"

melde_ergebnis() {
  rc=$?
  exec 2>&3
  [ -s "$FEHLERSCHNITT" ] && cat "$FEHLERSCHNITT" >&2
  if [ "$rc" -ne 0 ]; then
    text="Das taegliche Backup ist mit Rueckgabewert $rc abgebrochen."$'\n\n'
    text+="Letzte Ausgaben:"$'\n'"$(tail -20 "$FEHLERSCHNITT" 2>/dev/null)"$'\n\n'
    text+="Verzeichnis: $BACKUP_DIR"$'\n'
    text+="Protokoll:   $LOG"$'\n\n'
    text+="Bis das behoben ist, gibt es KEIN frisches Backup."
    [ -x "$ALARM" ] && "$ALARM" "Backup FEHLGESCHLAGEN" "$text"
  fi
  rm -f "$FEHLERSCHNITT"
}
trap melde_ergebnis EXIT

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

OUT="$BACKUP_DIR/echob-$(date +%F_%H%M).sql.gz.age"

# Nutzer und Datenbank kommen aus der Umgebung des Containers — so steht kein Zugangsdatum
# im Skript und es bleibt richtig, wenn sich die .env.docker ändert.
# Erst bei Erfolg umbenennen: Ein abgebrochener Lauf hinterlässt keine halbe Datei, die
# aussieht wie ein gültiges Backup.
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip \
  | age -r "$RECIPIENT" -o "$OUT.tmp"

mv "$OUT.tmp" "$OUT"
chmod 600 "$OUT"

echo "$(date -Is) OK   $OUT ($(du -h "$OUT" | cut -f1))" >> "$LOG"

# Rotation. Reste eines abgebrochenen Laufs mit aufräumen.
find "$BACKUP_DIR" -name 'echob-*.sql.gz.age' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name '*.tmp' -mtime +1 -delete 2>/dev/null || true
