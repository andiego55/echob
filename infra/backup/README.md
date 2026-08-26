# EchoB — Datenbank-Backups

Täglicher, **verschlüsselter** `pg_dump` der Produktions-Postgres (`echob`) auf dem
Hetzner-Server, plus ein **wöchentlicher Beweis**, dass sich das Backup zurückspielen lässt.

Stufe 1: lokal verschlüsselt. Off-site und asymmetrische Verschlüsselung folgen (unten).

| Datei | Was sie tut |
|---|---|
| `backup.sh` | Täglich: `pg_dump -Fc` → AES-256 → `/opt/echob/backups/`, 14 Tage Rotation. Schlägt bei Fehlschlag **Alarm**. |
| `restore-test.sh` | Wöchentlich: spielt das jüngste Backup in eine Wegwerf-Datenbank und prüft, ob Daten drin sind. Löscht sie danach. |

> **Die Skripte laufen direkt aus dem Git-Checkout.** `/opt/echob` *ist* das Repo — ein
> `git pull` aktualisiert sie mit. Die frühere Anleitung kopierte sie per `scp` nach
> `/opt/echob/backup/`; diese Kopie driftet vom Repo weg und ist nicht mehr nötig. Nur die
> **Passphrase** liegt weiterhin außerhalb des Repos unter `/opt/echob/backup/`.

## Einrichtung (einmalig, auf dem Server)

```bash
mkdir -p /opt/echob/backup /opt/echob/backups
chmod +x /opt/echob/infra/backup/*.sh /opt/echob/infra/monitor/*.sh
openssl rand -base64 48 > /opt/echob/backup/.backup_passphrase
chmod 600 /opt/echob/backup/.backup_passphrase
chmod 700 /opt/echob/backups
```

> ⚠️ **Die Passphrase zusätzlich außerhalb des Servers ablegen** (Passwortmanager). Ohne
> sie sind die Backups **unwiederbringlich** — spätestens wenn Off-site-Kopien dazukommen
> oder der Server verloren geht.

Danach einmal von Hand prüfen:

```bash
/opt/echob/infra/backup/backup.sh && ls -lh /opt/echob/backups/
/opt/echob/infra/backup/restore-test.sh
```

Die Cron-Einträge für beides stehen gesammelt in [`../monitor/README.md`](../monitor/README.md).

## Der wöchentliche Beweis (`restore-test.sh`)

Ein Backup, das nie zurückgespielt wurde, ist eine Vermutung. Die Datei kann da sein, die
richtige Größe haben, sich sogar entschlüsseln lassen — und trotzdem beim `pg_restore`
scheitern oder eine leere Hülle enthalten.

**Was als Beweis gilt:** nicht der Rückgabewert von `pg_restore` (der meldet auch bei
harmlosen Warnungen einen Fehler), sondern dass die zurückgespielte Datenbank die erwarteten
Tabellen hat **und** die Kerntabellen Zeilen enthalten. Zusätzlich wird das jüngste Datum
gemeldet — eine Datei von heute Nacht mit Daten von vor drei Wochen wäre der stillste aller
Fehler.

Geprüft wurde das Skript gegen vier Schadensbilder, jedes wird erkannt:

| Fall | Erkannt woran |
|---|---|
| Datei abgeschnitten | Zu wenige Tabellen |
| Falsche Passphrase | Entschlüsselung scheitert, 0 Tabellen |
| Kein Backup vorhanden | Abbruch vor dem Restore |
| **Restore läuft sauber, Kerntabelle ist leer** | Zeilenzählung — `pg_restore` meldete hier `rc=0` |

Der letzte Fall ist der Grund für die Zeilenzählung: Eine Prüfung auf den Rückgabewert hätte
ihn als Erfolg durchgewinkt.

**Sicherungen gegen das Schlimmste:** Der Zielname (`echob_restore_test`) ist fest verdrahtet
und wird gegen den Produktionsnamen geprüft; es wird nie mit `--clean` gearbeitet; und vorher
wird gerechnet, ob der Platz reicht — sonst würde ausgerechnet die Sicherheitsprüfung den
vollen Datenträger auslösen, den sie verhindern soll.

## Restore im Ernstfall (von Hand)

```bash
# In die ECHTE Datenbank zurückspielen. --clean --if-exists ersetzt bestehende Objekte.
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/opt/echob/backup/.backup_passphrase \
  -in /opt/echob/backups/echob-YYYYMMDD-HHMMSS.dump.enc \
  | docker compose -f /opt/echob/docker-compose.prod.yml exec -T postgres \
      pg_restore -U echob -d echob --clean --if-exists
```

Vorher die API stoppen (`docker compose -f … stop api`), damit nicht parallel geschrieben
wird, und danach wieder starten.

## Nächste Härtungsstufen

1. **Off-site-Kopie** — sonst sind bei Server- oder Ransomware-Verlust auch die Backups weg.
   Ziel z. B. Hetzner Storage Box (EU) via `rsync`/`rclone`, im Cron nach dem Dump. *Vorteil
   Hetzner: schon Auftragsverarbeiter — kein zusätzlicher AVV, kein neuer VVT-Eintrag.*
2. **Asymmetrische Verschlüsselung** (`age`/`gpg`) — nur der *öffentliche* Schlüssel liegt
   auf dem Server, der *private* off-server. Dann sind Backups auch bei Server-Kompromit­
   tierung für Angreifer wertlos.
3. **DSGVO:** Backups enthalten personenbezogene (Art.-9-)Daten → ins Verzeichnis der
   Verarbeitungstätigkeiten und ins Löschkonzept; Off-site-Ziel als Auftragsverarbeiter.
