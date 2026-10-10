#!/usr/bin/env bash
#
# EchoB — zaehlt Serverfehler in einem Stueck Logtext. Liest von STDIN.
#
# WARUM DAS EIN EIGENES SKRIPT IST UND NICHT EIN GREP IN watch.sh. Ein Suchmuster, das
# nie an einem echten Fehler gezeigt wurde, meldet fuer immer "null" — und sieht dabei aus
# wie Gesundheit. Genau das ist die gefaehrlichste Sorte Ueberwachung. Als eigenes Skript,
# das von STDIN liest, laesst es sich mit erfundenen Zeilen fuettern und beweisen:
# `selbsttest-fehler.sh` tut das.
#
# WAS ALS FEHLER ZAEHLT:
#   1. Eine Zugriffszeile mit 5xx — das ist, was die Nutzerin erlebt hat.
#   2. Ein "Traceback (most recent call last)" — die Ursache. Oft gibt es beides zu einem
#      Vorfall; deshalb werden sie getrennt gezaehlt und nicht addiert.
#
# Das echte Format von uvicorn, am 10.10.2026 auf dem Server abgelesen:
#   INFO:     1.2.3.4:0 - "POST /api/v1/cases/<uuid>/echo HTTP/1.1" 500 Internal Server Error
#
# WAS BEWUSST NICHT IN DIE MELDUNG WANDERT. Die Mail geht ueber Resend hinaus, also ueber
# einen Auftragsverarbeiter. Deshalb enthaelt die Zusammenfassung nur Methode, Pfad und
# Code — **keine** Traceback-Zeilen (die koennen Variableninhalte tragen) und **keine**
# IP-Adressen. Kennungen im Pfad werden zu <id>, sonst stuende die Fall-Kennung einer
# echten Person in einer E-Mail. Wer die Einzelheiten braucht, sieht in den Logs nach;
# der Alarm sagt nur, DASS und WO.
#
# AUSGABE (fuer den Aufrufer maschinenlesbar):
#   Zeile 1:  "<anzahl 5xx> <anzahl tracebacks>"
#   ab Zeile 2: die Zusammenfassung, eine Zeile je Pfad, haeufigste zuerst
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

MAX_ZEILEN="${ECHOB_FEHLER_MAX_ZEILEN:-10}"

text="$(cat)"

# 5xx in einer Zugriffszeile. Das Muster haengt am abschliessenden Anfuehrungszeichen der
# Anfrage, sonst faenge es auch eine 500 mitten in einem Pfad (/api/v1/foo/500).
fehler="$(printf '%s\n' "$text" | grep -E '"[A-Z]+ [^"]*" 5[0-9][0-9]( |$)' || true)"
anzahl="$(printf '%s' "$fehler" | grep -c . || true)"
tracebacks="$(printf '%s\n' "$text" | grep -cF 'Traceback (most recent call last)' || true)"

printf '%s %s\n' "${anzahl:-0}" "${tracebacks:-0}"

[ "${anzahl:-0}" -eq 0 ] && exit 0

printf '%s\n' "$fehler" \
  | sed -E \
      -e 's/^.*"([A-Z]+) ([^"]*) HTTP[^"]*" ([0-9]{3}).*$/\1 \2 \3/' \
      -e 's#[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}#<id>#g' \
      -e 's#/[0-9]+#/<id>#g' \
  | sort | uniq -c | sort -rn | head -n "$MAX_ZEILEN" \
  | sed -E 's/^ *([0-9]+) /  \1x  /'
