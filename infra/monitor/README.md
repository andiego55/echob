# EchoB — Betriebsüberwachung

Der Server passt auf sich selbst auf und meldet sich per Mail, **bevor** etwas ausfällt.

| Datei | Was sie tut |
|---|---|
| `alarm.sh` | Der eine Weg nach draußen: `alarm.sh "Betreff" "Text"` → Mail über Resend. |
| `watch.sh` | Alle 4 Stunden: Platte, Backup-Alter, Restore-Beweis, API-Erreichbarkeit. |

## Warum es das gibt

Das Backup lief wochenlang per Cron und hängte seine Ausgabe an eine Logdatei, die niemand
liest. Wäre es abgebrochen — fehlende Passphrase, Container unten, Platte voll — hätte das
niemand gemerkt. Man erfährt so etwas an dem Tag, an dem man das Backup braucht.

**Eine Überwachung, die nur protokolliert, ist keine.**

## Was geprüft wird, und warum genau das

| Prüfung | Grenzen | Warum |
|---|---|---|
| **Platte** | knapp < 3 GB, kritisch < 1,5 GB | Der einzige Posten, der unbemerkt und unbegrenzt wächst. Ist sie voll, hört Postgres auf zu schreiben **und** das Backup schlägt fehl — die beiden schlimmsten Fälle gleichzeitig. |
| **Backup** | älter als 36 Std. | Täglich um 03:30 nach `/var/backups/echob/`; 36 Stunden heißt: zwei Läufe verpasst. Geprüft wird die **Datei**, nicht ein Erfolgsvermerk. |
| **Restore** | länger als 45 Tage nicht bewiesen | Der Beweis läuft **von Hand auf deinem Rechner** (asymmetrische Verschlüsselung, siehe [`../backup/README.md`](../backup/README.md)). Monatlich reicht. |
| **API** | HTTP ≠ 200 | Ein Container kann laufen und trotzdem nichts beantworten. `restart: unless-stopped` fasst so einen nie an, weil er ja „läuft". |

Absolute Grenzen statt Prozente: Bei 40 GB Platte sind „10 % frei" noch 4 GB, bei 400 GB
wären es 40. Was zählt, ist, wie viele Gigabyte bis zum Stillstand bleiben.

Geprüft wird über `https://api.echo-b.de/api/v1/health`, nicht über `127.0.0.1` — der
`api`-Container veröffentlicht gar keinen Host-Port, nur Caddy hat 80/443. Der Umweg prüft
zusätzlich DNS, Zertifikat und Proxy, also die Kette, die auch der Nutzer erlebt.

## Warum nicht bei jedem Lauf gemeldet wird

Eine Warnung, die alle vier Stunden kommt, wird nach dem dritten Mal weggeklickt — und dann
auch die vierte, die echt war. Gemeldet wird deshalb nur der **Übergang**: ok → knapp,
knapp → kritisch, und die Entwarnung zurück. Der Zustand liegt in
`/var/backups/echob/.watch/`.

**Und trotzdem ein Wochenbericht:** Stille ist zweideutig. Sie kann „alles in Ordnung"
heißen oder „der Wächter läuft seit drei Wochen nicht mehr". Einmal pro Woche eine Mail mit
den nackten Zahlen löst das auf.

## Einrichtung (einmalig, auf dem Server)

```bash
chmod +x /opt/echob/infra/monitor/*.sh /opt/echob/infra/backup/*.sh
/opt/echob/infra/monitor/alarm.sh "Testalarm" "Wenn diese Mail ankommt, funktioniert der Weg."
```

Empfänger ist voreingestellt `andreasw5583@gmail.com` — bewusst ein Postfach **außerhalb**
der eigenen Domain: Wenn Resend, die Domain oder der Server das Problem *sind*, kommt die
Warnung trotzdem an. Änderbar über `ALARM_TO_EMAIL` in der `.env.docker`.

## Cron — alles auf einen Blick

`crontab -e` und einfügen:

```
30 3 * * *   /opt/echob/infra/backup/backup.sh >> /var/log/echob-backup.log 2>&1
0  */4 * * * /opt/echob/infra/monitor/watch.sh >> /var/log/echob-watch.log 2>&1
```

Nur zwei Einträge. Ein dritter für den Wiederherstellungs-Test wäre falsch: Er bräuchte
den privaten `age`-Schlüssel auf dem Server und würde damit genau den Schutz aufheben, den
die Verschlüsselung leistet. Dieser Beweis gehört auf deinen Rechner — siehe
[`../backup/README.md`](../backup/README.md).

## Was das *nicht* leistet

Eine Maschine, die tot ist, ruft nicht mehr an. Gegen einen harten Ausfall — Kernel-Panik,
Netz weg, Hetzner-Störung — hilft nur eine Prüfung von **außen** (Uptime-Dienst). Das hier
deckt alles ab, was den Server erreicht, ihn aber nicht umbringt, und das sind fast alle
Fälle.

Ebenso wird ein „unhealthy" Container von Docker **nicht** automatisch neu gestartet. Die
Prüfung in `docker-compose.prod.yml` macht den Zustand sichtbar; das Anschlagen erledigt
`watch.sh`.
