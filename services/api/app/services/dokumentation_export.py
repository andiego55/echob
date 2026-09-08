"""Export der Behandlungsdokumentation — eine Datei, die EchoB nicht mehr braucht.

**Wozu.** Die Fachperson muss ihre Dokumentation zehn Jahre aufbewahren (§ 630f BGB).
EchoB ist dafür der falsche Ort: Löscht die Klient:in ihr Konto, nimmt die Kaskade den
Fall mitsamt allem darin. Der Export ist die einzige ehrliche Antwort darauf — er bringt
ihre Aufzeichnungen in ihre eigene Sphäre, wo sie hingehören.

**Warum HTML und nicht PDF oder JSON.** Eine Akte muss man lesen können, auch in zehn
Jahren und ohne uns. JSON kann man nicht ablegen, PDF bräuchte eine Bibliothek im
Container und wäre schwerer zu prüfen. Eine einzelne HTML-Datei ohne externe Verweise
öffnet jeder Browser, druckt sauber und lässt sich mit „Als PDF sichern" in ein PDF
verwandeln, wenn die Praxis das braucht.

**Der gefährlichste Teil dieser Datei ist die Maskierung.** Hier fließt frei geschriebener
Text in HTML. Ein Notiztext, der zufällig `<script>` enthält — oder ein Klientenname mit
einem Anführungszeichen — würde ohne ``escape`` die Datei zerlegen oder Schlimmeres. Jede
einzelne Einsetzung geht deshalb durch ``_t()``; es gibt in diesem Modul keinen anderen
Weg, Text in die Ausgabe zu bekommen.
"""
from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import Any

#: Beschriftungen der sechs Felder des Fallüberblicks.
UEBERBLICK_LABELS: dict[str, str] = {
    "first_impressions": "Erster Eindruck",
    "key_scenes": "Schlüsselszenen",
    "open_questions": "Offene Fragen",
    "conversation_prompts": "Gesprächsangebote",
    "next_steps": "Nächste Schritte",
    "free_text": "Freitext",
}


#: Stand einer Vereinbarung oder eines Termins → deutsche Beschriftung.
STAND_LABELS: dict[str, str] = {
    "draft": "Entwurf", "sent": "gesendet", "seen": "gesehen",
    "in_progress": "in Arbeit", "completed": "erledigt",
    "dismissed": "abgelehnt", "revoked": "zurückgezogen",
    "proposed": "vorgeschlagen", "confirmed": "bestätigt", "cancelled": "abgesagt",
}

#: Art einer Vereinbarung → deutsche Beschriftung. Ein Export, in dem „questionnaire"
#: steht, ist eine Datenbankausgabe und keine Akte.
ART_LABELS: dict[str, str] = {
    "dialog": "Dialog",
    "questionnaire": "Fragebogen",
    "message": "Nachricht",
    "resource": "Ressource",
}


def _t(wert: Any) -> str:
    """Text → sicheres HTML. Zeilenumbrüche bleiben erhalten.

    Der einzige Weg, Inhalt in die Ausgabe zu bringen. Wer hier vorbeischreibt, baut eine
    Lücke in eine Datei, die später in einem Browser geöffnet wird.
    """
    if wert is None:
        return ""
    return escape(str(wert), quote=True).replace("\n", "<br>")


def _datum(wert: Any) -> str:
    if wert is None:
        return "—"
    if isinstance(wert, datetime):
        return wert.strftime("%d.%m.%Y")
    if hasattr(wert, "strftime"):
        return wert.strftime("%d.%m.%Y")
    return _t(wert)


_STIL = """
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2rem 1.5rem 4rem; background: #fff; color: #16202e;
         font: 15px/1.6 -apple-system, "Segoe UI", Roboto, sans-serif; }
  .blatt { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 .3rem; color: #0f1e2e; }
  h2 { font-size: 1.15rem; margin: 2.5rem 0 .75rem; padding-bottom: .3rem;
       border-bottom: 1px solid #dde5ef; color: #0f1e2e; page-break-after: avoid; }
  h3 { font-size: .95rem; margin: 1.5rem 0 .35rem; color: #16202e; page-break-after: avoid; }
  p { margin: 0 0 .75rem; }
  .kopf { font-size: .85rem; color: #46596b; }
  /* Eigene Klasse statt `.kopf dl`: Im Fallabschnitt IST das dl das `.kopf`-Element und
     wurde von einem Nachfahren-Selektor nicht getroffen — der Wert stand dann unter dem
     Label statt daneben. */
  dl.paar { display: grid; grid-template-columns: 11rem 1fr; gap: .25rem 1rem; margin: 1rem 0 0; }
  dl.paar dt { color: #6d8296; }
  dl.paar dd { margin: 0; }
  .hinweis { margin: 1.75rem 0 0; padding: .9rem 1rem; border-left: 3px solid #c8623c;
             background: #faf3f0; font-size: .85rem; line-height: 1.55; }
  .hinweis strong { color: #9d3b34; }
  .eintrag { margin: 0 0 1.25rem; padding: .85rem 1rem; border: 1px solid #dde5ef;
             border-radius: 4px; page-break-inside: avoid; }
  .eintrag .meta { font-size: .8rem; color: #6d8296; margin: 0 0 .5rem; }
  .abschnitt { margin: .75rem 0 0; }
  .abschnitt .titel { font-weight: 600; font-size: .88rem; }
  table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  th, td { text-align: left; padding: .45rem .5rem; border-bottom: 1px solid #dde5ef; }
  th { color: #6d8296; font-weight: 600; font-size: .8rem; }
  .leer { color: #6d8296; font-style: italic; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #dde5ef;
           font-size: .78rem; color: #6d8296; }
  @media print { body { padding: 0; } .eintrag { border-color: #ccc; } }
"""


def _fall_abschnitt(fall: dict) -> str:
    """Ein Fall: Kopf, Fallüberblick, Sitzungsnotizen, Vereinbarungen, Termine."""
    teile: list[str] = []
    name = _t(fall.get("client_display_name") or "Ohne Namen")
    teile.append(f"<h2>{name}</h2>")

    teile.append(
        '<dl class="paar kopf" style="margin-bottom:1rem">'
        f"<dt>Freigegeben seit</dt><dd>{_datum(fall.get('freigegeben_am'))}</dd>"
        f"<dt>Freigabe beendet</dt><dd>{_datum(fall.get('beendet_am'))}</dd>"
        "</dl>"
    )

    ueberblick = fall.get("ueberblick") or {}
    if ueberblick:
        teile.append("<h3>Fallüberblick</h3>")
        for feld, text in ueberblick.items():
            if not (text or "").strip():
                continue
            teile.append(
                f'<div class="abschnitt"><div class="titel">'
                f"{_t(UEBERBLICK_LABELS.get(feld, feld))}</div><p>{_t(text)}</p></div>"
            )

    notizen = fall.get("sitzungsnotizen") or []
    teile.append(f"<h3>Sitzungsnotizen ({len(notizen)})</h3>")
    if not notizen:
        teile.append('<p class="leer">Keine Sitzungsnotizen.</p>')
    for n in notizen:
        kopfzeile = _datum(n.get("session_date"))
        if n.get("title"):
            kopfzeile += f" · {_t(n['title'])}"
        block = [f'<div class="eintrag"><p class="meta">{kopfzeile}</p>']
        abschnitte = (n.get("content") or {}).get("sections") or []
        if not abschnitte:
            block.append('<p class="leer">Ohne Inhalt.</p>')
        for a in abschnitte:
            block.append(
                f'<div class="abschnitt"><div class="titel">{_t(a.get("heading"))}</div>'
                f"<p>{_t(a.get('text'))}</p></div>"
            )
        block.append("</div>")
        teile.append("".join(block))

    vereinbarungen = fall.get("vereinbarungen") or []
    if vereinbarungen:
        teile.append("<h3>Vereinbarungen</h3><table><tr>"
                     "<th>Erteilt am</th><th>Art</th><th>Titel</th><th>Stand</th></tr>")
        for v in vereinbarungen:
            teile.append(
                f"<tr><td>{_datum(v.get('created_at'))}</td>"
                f"<td>{_t(ART_LABELS.get(v.get('type'), v.get('type')))}</td>"
                f"<td>{_t(v.get('title'))}</td>"
                f"<td>{_t(STAND_LABELS.get(v.get('status'), v.get('status')))}</td></tr>"
            )
        teile.append("</table>")
        teile.append('<p class="leer" style="font-size:.82rem">'
                     "Die Antworten der Klient:in wurden mit dem Widerruf gelöscht.</p>")

    termine = fall.get("termine") or []
    if termine:
        teile.append("<h3>Termine</h3><table><tr>"
                     "<th>Beginn</th><th>Titel</th><th>Stand</th></tr>")
        for a in termine:
            teile.append(
                f"<tr><td>{_datum(a.get('start_at'))}</td><td>{_t(a.get('title'))}</td>"
                f"<td>{_t(STAND_LABELS.get(a.get('status'), a.get('status')))}</td></tr>"
            )
        teile.append("</table>")

    return "".join(teile)


def rendere(*, faelle: list[dict], fachperson: str | None, erstellt_am: datetime | None = None) -> str:
    """Baut die vollständige Exportdatei.

    Der Hinweiskasten oben ist kein Kleingedrucktes, sondern der wichtigste Absatz: Wer
    diese Datei in fünf Jahren aufschlägt, muss sofort sehen, dass sie **nicht** die
    vollständige Akte ist — die Inhalte der Klient:in stehen nicht darin und standen auch
    nie in EchoBs Verfügung, nachdem die Freigabe endete.
    """
    wann = (erstellt_am or datetime.now(UTC)).strftime("%d.%m.%Y, %H:%M Uhr")
    wer = _t(fachperson or "—")
    anzahl = len(faelle)

    koerper = "".join(_fall_abschnitt(f) for f in faelle) or (
        '<p class="leer">Keine Fälle mit eigenen Aufzeichnungen.</p>')

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Behandlungsdokumentation — Export aus EchoB</title>
<style>{_STIL}</style>
</head>
<body>
<div class="blatt">
  <h1>Behandlungsdokumentation</h1>
  <div class="kopf">
    <p>Export aus EchoB</p>
    <dl class="paar">
      <dt>Fachperson</dt><dd>{wer}</dd>
      <dt>Erstellt am</dt><dd>{_t(wann)}</dd>
      <dt>Enthaltene Fälle</dt><dd>{anzahl}</dd>
    </dl>
  </div>

  <div class="hinweis">
    <strong>Das ist nicht die vollständige Akte.</strong> Diese Datei enthält
    ausschließlich, was Sie selbst in EchoB aufgeschrieben haben: Fallüberblick,
    Sitzungsnotizen, erteilte Vereinbarungen und Termine. Die Inhalte der Klient:innen —
    Szenen, Fragebögen, Profile — sind nicht enthalten; sie gehören ihnen und werden mit
    dem Widerruf der Freigabe gelöscht. Ebenso die daraus erzeugten Berichte,
    Arbeitsmappen und KI-Gespräche.
    <br><br>
    Bewahren Sie diese Datei in Ihrem eigenen System auf. Die Aufbewahrungspflicht nach
    § 630f BGB trifft Sie, nicht EchoB — und ein Konto, das eine Klient:in löscht, nimmt
    ihren Fall mit.
  </div>

  {koerper}

  <footer>
    Erzeugt von EchoB am {_t(wann)}. Unveränderte Wiedergabe der in EchoB gespeicherten
    eigenen Aufzeichnungen.
  </footer>
</div>
</body>
</html>"""
