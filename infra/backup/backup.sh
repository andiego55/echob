#!/usr/bin/env bash
#
# EchoB — täglicher verschlüsselter Postgres-Backup (lokal).
#
#   pg_dump -Fc (komprimiertes Custom-Format)  →  AES-256 (openssl)  →  /opt/echob/backups/
#
# Bewusst „erstmal lokal". Nächste Härtungsstufen siehe README.md:
#   1) Off-site-Kopie (Hetzner Storage Box / B2) — Schutz bei Server-/Ransomware-Verlust.
#   2) Asymmetrische Verschlüsselung (age/gpg, PRIVATER Key NICHT auf dem Server).
#
# Einrichtung: siehe infra/backup/README.md
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE_DIR="/opt/echob"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/echob/backups"
PASS_FILE="/opt/echob/backup/.backup_passphrase"
RETENTION_DAYS=14
DB_USER="echob"
DB_NAME="echob"

test -s "$PASS_FILE" || { echo "FEHLER: Passphrase-Datei fehlt/leer: $PASS_FILE" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"

ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/echob-$ts.dump.enc"
tmp="$out.tmp"

cd "$COMPOSE_DIR"
# pg_dump als Stream → verschlüsseln → temporäre Datei (erst bei Erfolg umbenennen).
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" -Fc "$DB_NAME" \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$PASS_FILE" > "$tmp"

mv "$tmp" "$out"
chmod 600 "$out"

# Rotation: verschlüsselte Backups älter als RETENTION_DAYS löschen; Reste aufräumen.
find "$BACKUP_DIR" -name 'echob-*.dump.enc' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name '*.tmp' -mtime +1 -delete 2>/dev/null || true

size="$(du -h "$out" | cut -f1)"
echo "$(date -Is) OK $out ($size)" >> "$BACKUP_DIR/backup.log"
