#!/usr/bin/env bash
#
# EchoB — der eine Weg, auf dem der Server um Hilfe ruft.
#
#   alarm.sh "Betreff" "Text"
#
# WARUM ES DAS GIBT. Das Backup läuft seit Wochen per Cron und hängt seine Ausgabe an eine
# Logdatei, die niemand liest. Bricht es ab — fehlende Passphrase, Container unten, Platte
# voll — merkt das niemand. Man erfährt es an dem Tag, an dem man das Backup braucht.
# Dasselbe gilt für jede andere Prüfung: Eine Überwachung, die nur protokolliert, ist keine.
#
# WARUM ÜBER RESEND UND NICHT PER SENDMAIL. Auf dem Server läuft kein Mailserver, und einen
# aufzusetzen hieße: Paket, Konfiguration, Zustellbarkeit, SPF/DKIM — für drei Mails im
# Monat. Resend liegt ohnehin im `.env.docker`, spricht HTTPS und ist als Weg schon
# erprobt (`notify_service.py` nutzt denselben Endpunkt).
#
# WAS DAS NICHT LEISTET. Eine Maschine, die tot ist, ruft nicht mehr an. Gegen einen harten
# Ausfall hilft nur eine Prüfung von AUSSEN (Uptime-Dienst). Das hier deckt alles ab, was
# den Server erreicht, aber nicht umbringt — und das sind fast alle Fälle.
#
# RUECKGABEWERT: 0 nur bei echter Zustellung. Wer den Alarm ausloest, muss unterscheiden
# koennen zwischen „gemeldet“ und „versucht“ — sonst gilt ein Zustandswechsel als erledigt,
# den niemand gesehen hat.
#
# Absender: ALARM_FROM_EMAIL, sonst LEAD_FROM_EMAIL aus der .env.docker. Beide liegen auf
# der bei Resend verifizierten Domain, es braucht also nichts Zusätzliches.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

BETREFF="${1:?alarm.sh \"Betreff\" \"Text\"}"
TEXT="${2:-}"

ENV_FILE="${ECHOB_ENV_FILE:-/opt/echob/.env.docker}"
# Kommt aus der .env.docker. Bewusst OHNE Vorgabewert: Das Repo ist oeffentlich, und
# eine private Adresse darin waere ein Geschenk an jeden Adress-Sammler. Fehlt sie,
# wird das laut ins Protokoll geschrieben statt still nichts zu tun.
EMPFAENGER="${ALARM_TO_EMAIL:-}"
# Neben die uebrigen echob-Logs. Frueher zeigte das auf /opt/echob/backups - ein
# Verzeichnis, das seinen Zweck verlor, als klar wurde, dass die Backups nach
# /var/backups/echob gehen.
LOG="${ALARM_LOG:-/var/log/echob-alarm.log}"

zeit() { date '+%Y-%m-%d %H:%M:%S'; }
notiz() { echo "[$(zeit)] $*" >> "$LOG" 2>/dev/null || true; }

# Schlüssel und Absender aus der Umgebungsdatei ziehen, ohne sie zu exportieren oder
# irgendwo auszugeben.
if [ -r "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

SCHLUESSEL="${RESEND_API_KEY:-}"
ABSENDER="${ALARM_FROM_EMAIL:-${LEAD_FROM_EMAIL:-leads@echo-b.de}}"

# Immer zuerst ins Log. Auch wenn der Versand scheitert, ist die Meldung dann festgehalten.
notiz "$BETREFF — ${TEXT//$'\n'/ }"

if [ -z "$SCHLUESSEL" ]; then
  notiz "KEIN RESEND_API_KEY in $ENV_FILE — nicht versendet."
  exit 1
fi
if [ -z "$EMPFAENGER" ]; then
  notiz "KEIN ALARM_TO_EMAIL in $ENV_FILE — niemand wird benachrichtigt."
  exit 1
fi

# JSON von Hand zu bauen ist fehleranfällig, sobald der Text Anführungszeichen oder
# Zeilenumbrüche enthält — und genau das tun Fehlermeldungen. Deshalb baut Python das
# JSON; es ist auf jedem Debian/Ubuntu ohnehin vorhanden.
NUTZLAST="$(BETREFF="$BETREFF" TEXT="$TEXT" ABSENDER="$ABSENDER" EMPFAENGER="$EMPFAENGER" \
  python3 -c '
import json, os, socket
rechner = socket.gethostname()
print(json.dumps({
    "from": "EchoB Betrieb <" + os.environ["ABSENDER"] + ">",
    "to": [os.environ["EMPFAENGER"]],
    "subject": "[EchoB/" + rechner + "] " + os.environ["BETREFF"],
    "text": os.environ["TEXT"] or "(ohne Text)",
}))
' 2>>"$LOG")"

if [ -z "$NUTZLAST" ]; then
  notiz "Konnte die Nachricht nicht als JSON bauen — nicht versendet."
  exit 1
fi

ANTWORT="$(curl -sS --max-time 20 -o /tmp/alarm-antwort.$$ -w '%{http_code}' \
  -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $SCHLUESSEL" \
  -H "Content-Type: application/json" \
  -d "$NUTZLAST" 2>>"$LOG")" || ANTWORT="000"

if [ "$ANTWORT" = "200" ]; then
  notiz "zugestellt an $EMPFAENGER"
else
  notiz "Versand fehlgeschlagen (HTTP $ANTWORT): $(head -c 300 /tmp/alarm-antwort.$$ 2>/dev/null)"
fi
rm -f /tmp/alarm-antwort.$$

# Der Rueckgabewert sagt, ob ZUGESTELLT wurde. Der Waechter merkt sich einen
# Zustandswechsel sonst als gemeldet, obwohl niemand ihn je gesehen hat - die Warnung
# waere fuer immer verloren. Aufrufer duerfen daran nicht scheitern: backup.sh ruft das
# in einem trap, watch.sh laeuft ohne "set -e".
[ "$ANTWORT" = "200" ] && exit 0 || exit 1
