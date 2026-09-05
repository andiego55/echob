# EchoB — Datenbank-Backups

Täglicher, **asymmetrisch verschlüsselter** Dump der Produktions-Postgres auf dem
Hetzner-Server.

```
pg_dump → gzip → age (öffentlicher Schlüssel) → /var/backups/echob/
```

| Datei | Läuft wo | Was sie tut |
|---|---|---|
| `backup.sh` | Server, täglich 03:30 | Dump, verschlüsseln, 14 Tage Rotation. **Alarm bei Fehlschlag.** |
| `restore-pruefen.sh` | **Dein Rechner**, monatlich | Beweist, dass ein Backup entschlüsselbar, einspielbar und gefüllt ist. |

## Warum `age` und nicht eine Passphrase

`age -r <öffentlicher Schlüssel>` verschlüsselt gegen einen **öffentlichen** Schlüssel; der
private liegt nicht auf dem Server. Wer die Maschine übernimmt, bekommt die Backups nicht
auf. Eine symmetrische Passphrase neben den Dateien hätte diese Eigenschaft nicht.

> Der öffentliche Schlüssel steht im Skript und ist **kein Geheimnis** — er kann nur
> verschlüsseln. Der **private** gehört in den Passwortmanager und **nie** auf den Server,
> auch nicht kurz auf der Kommandozeile: Er landet sonst in `~/.bash_history` und hebt die
> ganze Eigenschaft auf.

## Der Preis dieser Stärke — und warum der Beweis auf deinem Rechner läuft

Ein *automatischer* Wiederherstellungs-Test auf dem Server ist damit unmöglich: Er bräuchte
den privaten Schlüssel dort. Das wäre kein Detail, sondern die Aufgabe genau des Schutzes,
für den `age` da ist.

Der Beweis gehört deshalb dorthin, wo der Schlüssel ohnehin ist — und erzeugt nebenbei die
erste Kopie außer Haus:

```bash
mkdir -p ~/echob-restore && cd ~/echob-restore
scp root@<SERVER-IP>:/var/backups/echob/echob-JJJJ-MM-TT_HHMM.sql.gz.age .
# privaten age-Schluessel UND den ENCRYPTION_KEY je in eine temporaere Datei schreiben
/pfad/zum/repo/infra/backup/restore-pruefen.sh echob-JJJJ-MM-TT_HHMM.sql.gz.age schluessel.txt encryption-key.txt
```

Das Skript startet einen Wegwerf-Postgres im Container, spielt den Dump hinein, zählt
Zeilen und räumt alles wieder ab — auch bei Abbruch. Es braucht `docker`, `age` und `gunzip`.

**Das dritte Argument ist der wichtigste Teil des Beweises.** Ohne es ist gezeigt, dass
Zeilen zurückkommen — nicht, dass man sie noch verstehen kann. Szenentexte, Dokumente,
Artefakte und Echo-Nachrichten liegen Fernet-verschlüsselt in der Datenbank. Wäre der
`ENCRYPTION_KEY` verloren, liefe die Prüfung ohne ihn durch und meldete Erfolg, während die
Daten praktisch weg wären. **Der `ENCRYPTION_KEY` ist genauso überlebenswichtig wie der
age-Schlüssel** und gehört an einen zweiten Ort als der Server.

Die Leseprobe entschlüsselt eine echte Nachricht und gibt trotzdem keinen Klartext aus —
sie meldet nur, dass es ging und wie lang er war. Nimmt Fernet den Token an, stimmen
Schlüssel und Signatur; der Inhalt muss dafür niemandem gezeigt werden. Sie braucht Python
mit `cryptography`; fehlt beides, wird sie übersprungen statt zu scheitern.

**Danach: heruntergeladene Datei und BEIDE Schlüsseldateien löschen.** Entschlüsselt sind das echte
Nutzerdaten, inklusive Art.-9-Daten.

Am Ende nennt es den Befehl, mit dem der Beweis auf dem Server vermerkt wird — sonst mahnt
der Wächter ihn nach 45 Tagen an:

```bash
ssh root@<SERVER-IP> 'date +%s > /var/backups/echob/.restore-test-ok'
```

## Was als Beweis gilt

Nicht, dass `psql` ohne Fehler durchlief — bei einem SQL-Dump laufen fast immer Meldungen
mit. Bewiesen ist es, wenn die Datenbank die erwarteten Tabellen hat **und** die
Kerntabellen (`user_profiles`, `cases`, `echo_messages`) Zeilen enthalten. Zusätzlich wird
das jüngste Datum gemeldet: Eine Datei von heute Nacht mit Daten von vor drei Wochen wäre
der stillste aller Fehler.

Der Ansatz wurde gegen vier Schadensbilder geprüft, jedes wird erkannt:

| Fall | Erkannt woran |
|---|---|
| Datei abgeschnitten | Zu wenige Tabellen |
| Falscher Schlüssel | Entschlüsselung scheitert, bevor ein Container startet |
| Kein Backup vorhanden | Abbruch vor dem Einspielen |
| **Restore läuft sauber, Kerntabelle ist leer** | Zeilenzählung — hier meldete der Restore Erfolg |

Der letzte Fall ist der Grund für die Zeilenzählung: Eine Prüfung auf den Rückgabewert hätte
ihn durchgewinkt.

## Herkunft dieses Skripts

`backup.sh` lief monatelang unversioniert als `/root/echob-backup.sh` und hat dort
zuverlässig gearbeitet — 20 aufeinanderfolgende erfolgreiche Läufe im Protokoll. Es steht
jetzt im Repo, weil ein Backup-Skript, das nur auf dem Server existiert, mit dem Server
stirbt. Der Kern ist unverändert; ergänzt wurden Alarm bei Fehlschlag, `chmod 600` auf die
Dateien und das Aufräumen liegengebliebener `.tmp`-Reste.

Eine frühere, **symmetrisch** verschlüsselte Fassung (`openssl enc` mit Passphrase) wurde
entfernt: Sie war dem Vorhandenen unterlegen, und zwei Backup-Skripte nebeneinander sind
genau die Drift, die solche Zustände erzeugt.

## Umstellung auf die versionierte Fassung

Der Cron zeigt noch auf `/root/echob-backup.sh`. Umstellen (das alte Skript bleibt als
Sicherheitsnetz liegen, bis der erste versionierte Lauf durch ist):

```bash
crontab -e
# Zeile ersetzen durch:
# 30 3 * * * /opt/echob/infra/backup/backup.sh >> /var/log/echob-backup.log 2>&1
```

Die übrigen Cron-Einträge stehen in [`../monitor/README.md`](../monitor/README.md).

## Schlüsselwechsel (wenn der private Schlüssel verloren oder kompromittiert ist)

Ohne den privaten Schlüssel sind vorhandene Backups mathematisch wertlos — daran lässt
sich nichts reparieren. Der Datenbestand selbst ist davon **nicht** betroffen: Die
Datenbank läuft weiter, verloren ist nur die Rückfalloption.

Die richtige Reaktion ist deshalb nicht Suchen bis zur Erschöpfung, sondern schnell wieder
in einen beweisbaren Zustand kommen:

```bash
# 1. Auf DEINEM Rechner (nicht auf dem Server) ein neues Paar erzeugen
age-keygen -o echob-age-identity.txt
# Ausgabe: "Public key: age1..."  <- das ist der oeffentliche Teil

# 2. Den INHALT von echob-age-identity.txt sofort in den Passwortmanager,
#    Eintrag z.B. "EchoB Backup - age private key (ab JJJJ-MM-TT)".
#    Erst danach weiterarbeiten.

# 3. Oeffentlichen Schluessel auf dem Server hinterlegen - ohne das Skript zu aendern:
#    (in /opt/echob/.env.docker ergaenzen)
#    ECHOB_AGE_RECIPIENT=age1...

# 4. Sofort ein Backup ziehen und beweisen
/opt/echob/infra/backup/backup.sh
#    dann auf deinem Rechner: restore-pruefen.sh mit dem NEUEN Schluessel
```

**Alte Backups.** Sie bleiben mit dem alten Schlüssel verschlüsselt. Ist der weg, sind sie
Datenmüll: Sie belegen Platz und täuschen Sicherheit vor. Nach einer bewussten
Entscheidung löschen — die Rotation nach 14 Tagen erledigt es sonst von allein.

**Warum `ECHOB_AGE_RECIPIENT` und nicht das Skript ändern:** Der Empfänger ist eine
Betriebs-Einstellung, keine Programmlogik. In der `.env.docker` steht er neben allem
anderen Umgebungsabhängigen und ein Wechsel braucht kein Deployment.

**Der private Schlüssel gehört nie auf den Server** — auch nicht kurz, auch nicht in einer
Datei, die man danach löscht. `age-keygen` läuft auf deinem Rechner; der Server bekommt nur
die öffentliche Hälfte zu sehen.

## Offen

1. **Off-site-Kopie** — die Backups liegen auf derselben Platte wie die Datenbank. Ein
   Serververlust nimmt beides mit. Ziel z. B. Hetzner Storage Box (EU); *Vorteil: schon
   Auftragsverarbeiter — kein zusätzlicher AVV, kein neuer VVT-Eintrag.*
2. **DSGVO** — Backups enthalten personenbezogene (Art.-9-)Daten → ins Verzeichnis der
   Verarbeitungstätigkeiten und ins Löschkonzept.
