#!/usr/bin/env bash
#
# EchoB — die Probe fuer `fehler-zaehlen.sh`.
#
# WARUM ES DIESE DATEI GIBT. Ein Waechter, der Fehler zaehlt, meldet im Normalfall "null".
# Genau dasselbe meldet er, wenn sein Suchmuster nicht passt — etwa weil uvicorn sein
# Logformat aendert oder jemand einen Reverse-Proxy davorsetzt. Die beiden Faelle sehen
# von aussen gleich aus, und der falsche von beiden sieht aus wie Gesundheit.
#
# Deshalb werden hier erfundene Zeilen durchgeschickt, von denen man WEISS, was
# herauskommen muss — darunter die Gegenprobe, dass 200er und 404er NICHT als Fehler
# zaehlen. Ein Zaehler, der alles zaehlt, ist genauso nutzlos wie einer, der nichts findet.
#
# Aufruf:  infra/monitor/selbsttest-fehler.sh
# Rueckgabe: 0 wenn alle Proben stimmen, sonst 1.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZAEHLER="$HIER/fehler-zaehlen.sh"

fehlgeschlagen=0

probe() {
  local name="$1" erwartet="$2" eingabe="$3"
  local ergebnis
  ergebnis="$(printf '%s' "$eingabe" | bash "$ZAEHLER" | head -1)"
  if [ "$ergebnis" = "$erwartet" ]; then
    echo "ok   $name"
  else
    echo "FEHL $name — erwartet '$erwartet', bekommen '$ergebnis'"
    fehlgeschlagen=1
  fi
}

# Das echte Format, am 10.10.2026 vom Server abgelesen.
ZEILE_200='INFO:     1.2.3.4:0 - "GET /api/v1/health HTTP/1.1" 200 OK'
ZEILE_404='INFO:     5.6.7.8:0 - "GET /public/info.php HTTP/1.1" 404 Not Found'
ZEILE_500='INFO:     1.2.3.4:0 - "POST /api/v1/cases/abc HTTP/1.1" 500 Internal Server Error'
ZEILE_503='INFO:     1.2.3.4:0 - "GET /api/v1/reports HTTP/1.1" 503 Service Unavailable'
ZEILE_TB='Traceback (most recent call last):'

probe "nichts drin"                 "0 0" ""
probe "nur 200er"                   "0 0" "$ZEILE_200"
probe "404 zaehlt NICHT"            "0 0" "$ZEILE_404"$'\n'"$ZEILE_200"
probe "ein 500er"                   "1 0" "$ZEILE_500"
probe "500 und 503"                 "2 0" "$ZEILE_500"$'\n'"$ZEILE_503"
probe "Traceback getrennt gezaehlt" "1 1" "$ZEILE_500"$'\n'"$ZEILE_TB"
probe "nur Traceback, kein 5xx"     "0 1" "$ZEILE_TB"
probe "zwischen Grundrauschen"      "1 0" "$ZEILE_404"$'\n'"$ZEILE_200"$'\n'"$ZEILE_500"$'\n'"$ZEILE_200"

# Die Falle, derentwegen das Muster am Anfuehrungszeichen haengt: eine 500 im PFAD.
probe "500 im Pfad ist kein Fehler" "0 0" \
  'INFO:     1.2.3.4:0 - "GET /api/v1/szenen/500 HTTP/1.1" 200 OK'

# ── Und was in der Zusammenfassung steht ────────────────────────────────────
echo
echo "— Zusammenfassung bei echten Kennungen —"
AUSGABE="$(printf '%s\n' \
  'INFO: 1.2.3.4:0 - "POST /api/v1/cases/3f2504e0-4f89-11d3-9a0c-0305e82c3301/echo HTTP/1.1" 500 Internal Server Error' \
  'INFO: 9.9.9.9:0 - "POST /api/v1/cases/7c9e6679-7425-40de-944b-e07fc1f90ae7/echo HTTP/1.1" 500 Internal Server Error' \
  | bash "$ZAEHLER")"
echo "$AUSGABE"

if printf '%s' "$AUSGABE" | grep -qE '3f2504e0|7c9e6679'; then
  echo "FEHL Kennungen stehen unmaskiert in der Meldung"
  fehlgeschlagen=1
else
  echo "ok   Kennungen sind maskiert"
fi
if printf '%s' "$AUSGABE" | grep -qE '1\.2\.3\.4|9\.9\.9\.9'; then
  echo "FEHL IP-Adresse steht in der Meldung"
  fehlgeschlagen=1
else
  echo "ok   keine IP-Adressen in der Meldung"
fi
# Zwei verschiedene Faelle, nach dem Maskieren derselbe Pfad -> eine Zeile, Zaehler 2.
if printf '%s' "$AUSGABE" | grep -qE '2x .*cases/<id>/echo 500'; then
  echo "ok   gleichartige Fehler werden zusammengefasst"
else
  echo "FEHL Zusammenfassung gruppiert nicht wie erwartet"
  fehlgeschlagen=1
fi

echo
if [ "$fehlgeschlagen" -eq 0 ]; then
  echo "Alle Proben bestanden."
else
  echo "PROBEN FEHLGESCHLAGEN — der Zaehler taugt so nicht."
fi
exit "$fehlgeschlagen"
