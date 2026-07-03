# EchoB — Datenbank-Backups

Täglicher, **verschlüsselter** `pg_dump` der Produktions-Postgres (`echob`) auf dem
Hetzner-Server. Stufe 1: **lokal verschlüsselt**. Off-site + asymmetrische
Verschlüsselung folgen als Härtung (unten).

## Einrichtung (einmalig, auf dem Server)

```bash
# 1. Skript auf den Server kopieren (vom Repo-Root aus)
scp infra/backup/backup.sh root@162.55.44.26:/opt/echob/backup/backup.sh

# 2. Auf dem Server: ausführbar machen + Passphrase erzeugen
ssh root@162.55.44.26
mkdir -p /opt/echob/backup
chmod +x /opt/echob/backup/backup.sh
openssl rand -base64 48 > /opt/echob/backup/.backup_passphrase
chmod 600 /opt/echob/backup/.backup_passphrase
```

> ⚠️ **WICHTIG:** Speichere die Passphrase ZUSÄTZLICH **außerhalb des Servers**
> (Passwortmanager). Ohne sie sind die Backups **unwiederbringlich** — spätestens
> wenn off-site-Kopien dazukommen oder der Server verloren geht.

```bash
# 3. Testlauf + prüfen
/opt/echob/backup/backup.sh
ls -lh /opt/echob/backups/
cat /opt/echob/backups/backup.log

# 4. Täglich per Cron (03:30). crontab -e und einfügen:
30 3 * * * /opt/echob/backup/backup.sh >> /opt/echob/backups/cron.log 2>&1
```

## Restore (getestet — ein Backup ohne getesteten Restore ist kein Backup)

```bash
# Entschlüsseln → pg_restore. --clean --if-exists ersetzt bestehende Objekte.
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/opt/echob/backup/.backup_passphrase \
  -in /opt/echob/backups/echob-YYYYMMDD-HHMMSS.dump.enc \
  | docker compose -f /opt/echob/docker-compose.prod.yml exec -T postgres \
      pg_restore -U echob -d echob --clean --if-exists
```

Zum **gefahrlosen Test** besser in eine Wegwerf-DB restaurieren:
```bash
docker compose -f /opt/echob/docker-compose.prod.yml exec -T postgres createdb -U echob echob_restore_test
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/opt/echob/backup/.backup_passphrase \
  -in /opt/echob/backups/echob-YYYYMMDD-HHMMSS.dump.enc \
  | docker compose -f /opt/echob/docker-compose.prod.yml exec -T postgres pg_restore -U echob -d echob_restore_test
# prüfen, dann: dropdb -U echob echob_restore_test
```

## Nächste Härtungsstufen (empfohlen vor echten Nutzerdaten)

1. **Off-site-Kopie** — sonst sind bei Server-/Ransomware-Verlust auch die Backups weg.
   Ziel z. B. Hetzner Storage Box (EU) via `rsync`/`rclone`; ins Cron nach dem Dump.
2. **Asymmetrische Verschlüsselung** (`age`/`gpg`) — nur der *öffentliche* Schlüssel
   liegt auf dem Server, der *private* off-server. Dann sind Backups auch bei
   Server-Kompromittierung wertlos für Angreifer.
3. **DSGVO:** Backups enthalten personenbezogene (Art.-9-)Daten → in Verzeichnis der
   Verarbeitungstätigkeiten + Löschkonzept aufnehmen; Off-site-Ziel als
   Auftragsverarbeiter (AVV) führen.
