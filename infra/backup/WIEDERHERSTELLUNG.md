# Wiederherstellung — Schritt für Schritt

**Für den Ernstfall geschrieben, nicht zum Querlesen.** Wenn du das hier brauchst, ist
etwas kaputt, es ist vermutlich Nacht, und du willst nicht nachdenken müssen. Arbeite die
Schritte von oben nach unten ab. Jeder Schritt sagt, was er tut, was danach dastehen muss,
und was zu tun ist, wenn etwas anderes dasteht.

Es gibt zwei Lagen. Fang bei der richtigen an:

| Lage | Gehe zu |
|---|---|
| Die Daten sind weg oder falsch, **der Server läuft** | [A — Zurückspielen](#a--zurückspielen) |
| **Der Server ist weg** (Totalverlust, Hetzner-Ausfall, Übernahme) | [B — Neu aufbauen](#b--neu-aufbauen) |
| Du willst nur **prüfen**, ob die Backups taugen | [C — Beweis ohne Risiko](#c--beweis-ohne-risiko) |

---

## Was du in jedem Fall brauchst

Drei Dinge. Fehlt eines, funktioniert die Wiederherstellung **nicht** — auch nicht teilweise.

| | Was | Wo es liegt |
|---|---|---|
| 1 | Die Backup-Datei `echob-*.sql.gz.age` | Server: `/var/backups/echob/` |
| 2 | **Privater age-Schlüssel** (`AGE-SECRET-KEY-1…`) | Passwortmanager |
| 3 | **`ENCRYPTION_KEY`** (44 Zeichen, endet auf `=`) | Passwortmanager |

**Warum drei.** Das Backup ist mit `age` verschlüsselt — ohne (2) bekommst du die Datei
nicht auf. Und die Inhalte darin sind zusätzlich Feld für Feld mit Fernet verschlüsselt —
ohne (3) bekommst du zwar Zeilen zurück, aber Szenentexte, Nachrichten, Dokumente und
Erkenntnisse sind unlesbarer Zeichensalat.

> **Der Schlüssel steckt nicht im Backup.** Das ist Absicht: Wer den Server übernimmt, soll
> mit den Backups nichts anfangen können. Es heißt aber auch, dass dein Passwortmanager
> genauso kritisch ist wie der Server.

---

## A — Zurückspielen

*Der Server läuft, aber die Daten sind kaputt, gelöscht oder in einem falschen Zustand.*

### A1 · Erst nachsehen, dann handeln

Bevor du irgendetwas überschreibst: Sieh dir an, was da ist.

```bash
cd /opt/echob && set -a && . ./.env.docker && set +a && docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 'Faelle' AS was, count(*) FROM cases UNION ALL SELECT 'Szenen', count(*) FROM scenes UNION ALL SELECT 'Nachrichten', count(*) FROM echo_messages;"
```

Schreib die Zahlen auf. Nach dem Zurückspielen vergleichst du sie.

**Wenn hier schon ein Fehler kommt** („relation does not exist", „database does not exist"),
ist mehr kaputt als nur Daten — dann weiter bei [B](#b--neu-aufbauen).

### A2 · Das richtige Backup wählen

```bash
ls -la /var/backups/echob/
```

Nimm nicht reflexhaft das neueste. **Frag zuerst: Wann ist der Schaden passiert?** Wurde um
14 Uhr etwas versehentlich gelöscht, ist das Backup von 03:30 desselben Tages richtig — das
von morgen früh enthielte den Schaden bereits.

### A3 · Die laufende Datenbank sichern, bevor du sie anfasst

**Diesen Schritt nicht überspringen.** Er kostet zwanzig Sekunden und ist deine einzige
Rückfahrkarte, wenn das Zurückspielen die Lage verschlimmert.

```bash
cd /opt/echob && set -a && . ./.env.docker && set +a && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "/var/backups/echob/VOR-WIEDERHERSTELLUNG-$(date +%F_%H%M).sql.gz"
```

Diese Datei ist **unverschlüsselt** und liegt auf dem Server. Lösche sie, sobald die Lage
geklärt ist.

### A4 · API anhalten

Solange die API läuft, schreibt sie in die Datenbank, während du sie zurückspielst. Das
Ergebnis wäre ein Mischzustand, den niemand mehr auseinandersortiert.

```bash
cd /opt/echob && docker compose -f docker-compose.prod.yml stop api && docker compose -f docker-compose.prod.yml ps
```

**Muss dastehen:** `api` ist `exited` oder fehlt in der Liste; `postgres` und `caddy` laufen
weiter. Postgres **muss** laufen — dort spielst du gleich hinein.

Ab jetzt ist die App für Nutzer nicht erreichbar. Das ist gewollt.

### A5 · Backup entschlüsseln

Der private age-Schlüssel gehört **nicht** auf den Server — auch nicht kurz. Entschlüsselt
wird deshalb auf deinem Rechner.

Auf **deinem Rechner** (Git Bash):

```bash
scp root@<SERVER-IP>:/var/backups/echob/echob-JJJJ-MM-TT_HHMM.sql.gz.age .
```

Schlüssel aus dem Passwortmanager in eine Datei schreiben, etwa `age-key.txt`, dann:

```bash
age -d -i age-key.txt echob-JJJJ-MM-TT_HHMM.sql.gz.age | gunzip > wiederherstellung.sql
```

**Muss dastehen:** keine Ausgabe, und `wiederherstellung.sql` ist mehrere Megabyte groß.

```bash
ls -la wiederherstellung.sql && head -3 wiederherstellung.sql
```

Die ersten Zeilen sehen aus wie `-- PostgreSQL database dump`. Steht dort etwas anderes
oder ist die Datei winzig, war es der falsche Schlüssel oder eine beschädigte Datei — nimm
das Backup vom Vortag.

### A6 · Zurückspielen

Die entschlüsselte Datei auf den Server bringen und einspielen. Der Dump legt Tabellen neu
an; bestehende müssen weg, sonst kollidiert alles.

```bash
scp wiederherstellung.sql root@<SERVER-IP>:/tmp/
```

Auf dem **Server**:

```bash
cd /opt/echob && set -a && . ./.env.docker && set +a && docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB WITH (FORCE);" -c "CREATE DATABASE $POSTGRES_DB;" && docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /tmp/wiederherstellung.sql
```

> **Wozu `WITH (FORCE)`.** `DROP DATABASE` scheitert sonst, sobald noch irgendeine
> Verbindung offen ist — und genau das passiert nachts zuverlässig: eine hängengebliebene
> Sitzung, ein Container, der noch nicht ganz aus ist. Die Meldung lautet dann
> `database "echob" is being accessed by other users`, und man sucht im Dunkeln. `FORCE`
> beendet diese Verbindungen. Postgres 16 kann das; die App ist in A4 ohnehin gestoppt.

> **`DROP DATABASE` löscht den aktuellen Stand unwiderruflich.** Deshalb A3. Bist du dir
> unsicher, ob A3 geklappt hat — jetzt nachsehen, nicht später.

**Muss dastehen:** viele Zeilen `CREATE TABLE`, `COPY`, `ALTER TABLE`. Warnungen zu Rollen
oder Erweiterungen sind harmlos. Ein Abbruch mit `ERROR` ist es nicht — dann steht in der
letzten Zeile, woran es lag.

### A7 · Nachzählen

```bash
cd /opt/echob && set -a && . ./.env.docker && set +a && docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 'Faelle' AS was, count(*) FROM cases UNION ALL SELECT 'Szenen', count(*) FROM scenes UNION ALL SELECT 'Nachrichten', count(*) FROM echo_messages;"
```

Vergleiche mit A1. Die Zahlen sollen zum gewählten Backup passen — nicht zwingend zum
Zustand von vorher.

### A8 · Prüfen, dass der ENCRYPTION_KEY noch steht

**Der häufigste Fehler an dieser Stelle.** Die App startet auch ohne den Schlüssel — sie
liefert dann nur Zeichensalat aus, und das merkt man erst, wenn ein Nutzer sich meldet.

```bash
cd /opt/echob && grep -c '^ENCRYPTION_KEY=.\+' .env.docker
```

**Muss dastehen:** `1`. Steht dort `0`, trag den Schlüssel aus dem Passwortmanager in
`.env.docker` ein, **bevor** du die API startest.

### A9 · API starten

```bash
cd /opt/echob && docker compose -f docker-compose.prod.yml up -d api && sleep 15 && curl -s -o /dev/null -w '%{http_code}\n' https://api.echo-b.de/api/v1/health
```

**Muss dastehen:** `200`.

Kommt etwas anderes, sieh in die Protokolle:

```bash
cd /opt/echob && docker compose -f docker-compose.prod.yml logs --tail 50 api
```

### A10 · Mit eigenen Augen nachsehen

Melde dich in der App an und öffne eine Szene. **Lies den Text.** Ist er lesbar, stimmt der
`ENCRYPTION_KEY`. Steht dort `enc:v1:gAAAAA…`, ist der Schlüssel falsch oder fehlt — zurück
zu A8.

Das ist der eigentliche Abschluss. Zahlen in der Datenbank beweisen nichts über Lesbarkeit.

### A11 · Aufräumen

```bash
ssh root@<SERVER-IP> 'rm -f /tmp/wiederherstellung.sql'
rm -f wiederherstellung.sql echob-*.sql.gz.age age-key.txt
```

Beides enthält unverschlüsselte Nutzerdaten, darunter Art.-9-Daten. Nicht liegen lassen.

---

## B — Neu aufbauen

*Der Server ist verloren: Hardware weg, Hetzner-Ausfall, Übernahme, Kündigung.*

Die Reihenfolge ist wichtig. Wer die API vor der Datenbank startet, bekommt eine App, die
in eine leere Datenbank schreibt.

1. **Neuen Server aufsetzen** nach `DEPLOY.md` — bis einschließlich `docker compose … up -d`,
   aber **ohne** Nutzer darauf zu lassen.
2. **`.env.docker` wiederherstellen.** Alle Geheimnisse aus dem Passwortmanager, insbesondere
   `ENCRYPTION_KEY`. **Muss derselbe sein wie vorher** — ein neuer macht alle alten Daten
   unlesbar.
3. **API anhalten:** `docker compose -f docker-compose.prod.yml stop api`
4. **Backup einspielen** — Schritte [A5](#a5--backup-entschlüsseln) bis [A7](#a7--nachzählen).
5. **Migrationen prüfen.** Der Dump enthält den Schemastand des Backup-Tages. Ist der Code
   inzwischen weiter, fehlen Spalten. Alle Migrationen laufen lassen, die nach dem
   Backup-Datum dazukamen — siehe `infra/docker/postgres/init/`, aufsteigend nummeriert.
   Sie sind idempotent; ein zweiter Lauf schadet nicht.
6. **API starten** — [A9](#a9--api-starten) und [A10](#a10--mit-eigenen-augen-nachsehen).
7. **DNS umstellen**, falls die IP eine neue ist.
8. **Backups wieder einrichten:** `infra/backup/backup.sh` in die Zeitsteuerung eintragen,
   `infra/monitor/watch.sh` ebenso. Sonst läuft der neue Server ohne Netz.

**Woran es hier am ehesten scheitert:** ein anderer `ENCRYPTION_KEY` als vorher. Die App
startet, die Daten sind da, und nichts ist lesbar. Deshalb Schritt 2 vor allem anderen.

---

## C — Beweis ohne Risiko

*Nichts ist kaputt. Du willst wissen, ob die Backups etwas taugen.*

Das gehört **regelmäßig** gemacht — der Wächter mahnt nach 45 Tagen. Es fasst nichts an:
Es läuft auf deinem Rechner in einem Wegwerf-Container, der danach gelöscht wird.

```bash
scp root@<SERVER-IP>:/var/backups/echob/echob-JJJJ-MM-TT_HHMM.sql.gz.age .
bash /pfad/zum/repo/infra/backup/restore-pruefen.sh echob-JJJJ-MM-TT_HHMM.sql.gz.age age-key.txt encryption-key.txt
```

**Das dritte Argument ist der wichtigste Teil.** Ohne es wird geprüft, ob Zeilen
zurückkommen — nicht, ob man sie noch verstehen kann.

Das Skript prüft die **neueste und die älteste** verschlüsselte Nachricht. Gilt der
Schlüssel für beide Ränder, ist dazwischen kein Schlüsselwechsel passiert.

Danach: Datei und **beide** Schlüsseldateien löschen, und den Beweis vermerken:

```bash
ssh root@<SERVER-IP> 'date +%s > /var/backups/echob/.restore-test-ok'
```

Einzelheiten in [README.md](README.md).

---

## Wenn etwas nicht wie beschrieben aussieht

| Was du siehst | Was es bedeutet | Was zu tun ist |
|---|---|---|
| `age: error: no identity matched` | Falscher privater Schlüssel | Anderen Eintrag im Passwortmanager probieren |
| Entschlüsselte Datei ist winzig oder leer | Backup beschädigt | Backup vom Vortag nehmen |
| `psql` bricht mit `ERROR` ab | Dump passt nicht zum Schema | Letzte Zeile lesen; ggf. Datenbank neu anlegen (A6) |
| App läuft, Texte zeigen `enc:v1:gAAAAA…` | `ENCRYPTION_KEY` fehlt oder ist falsch | A8, dann API neu starten |
| App läuft, Texte sind leer statt verschlüsselt | Andere Ursache — nicht die Verschlüsselung | Protokolle lesen |
| `curl` liefert nicht `200` | API startet nicht | `docker compose … logs --tail 50 api` |

## Was diese Anleitung nicht abdeckt

* **Wiederherstellung eines einzelnen Falls** oder einer einzelnen Szene. Dafür das Backup
  nach [C](#c--beweis-ohne-risiko) in den Wegwerf-Container spielen, dort die gewünschten
  Zeilen herausziehen und von Hand einsetzen. Nie den ganzen Dump zurückspielen, um eine
  Zeile zu retten.
* **Datenverlust seit dem letzten Backup.** Der Lauf ist täglich um 03:30; bis zu 24 Stunden
  sind im Ernstfall verloren. Häufigere Läufe oder ein Zweitsystem wären eine eigene
  Entscheidung.
* **Ein Ausfall, bei dem auch die Backups weg sind.** Alle Kopien liegen derzeit auf
  derselben Maschine wie die Datenbank. Die Off-site-Kopie ist offen und wartet auf die
  UG-Gründung.
