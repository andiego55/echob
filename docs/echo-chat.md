# Der Echo-Chat: Aufbau und Sicherheit

Wie eine Nachricht durch das System läuft, an welchen Stellen Sicherheit greift, und was
man wissen muss, bevor man daran etwas ändert.

Ergänzt [`safety-and-claims.md`](safety-and-claims.md) (*was* Echo sagen darf) um das
*wie* — den technischen Weg und die Stellen, an denen die Regeln durchgesetzt werden.

---

## Der Weg einer Nachricht

Sechs Phasen, immer in dieser Reihenfolge. Die Reihenfolge ist keine Konvention, sondern
Teil der Sicherheit: Was vor der Antwort steht, kann sie verhindern.

| # | Phase | Wo | Was passiert |
|---|-------|-----|--------------|
| 1 | **Kontingent** | `subscription_service.enforce_echo_prompt_limit` | Abbruch mit Code, bevor irgendetwas kostet |
| 2 | **Vorbereitung** | `echo.py · _vorbereiten` | Fall prüfen, Szenen, Skalen, Profile, Sitzung, letzte 20 Nachrichten |
| 3 | **Kontext** | `echo.py · _kontext_bauen` | Selbstauskunft, Personenprofil, Zusammenfassungen, Hypothesen, Aussteuerung |
| 4 | **Sicherheits-Triage** | `echo.py · _triage_pruefen` | Einstufung der Nutzernachricht — **vor** jeder Antwort |
| 5 | **Antwort** | `echo_service.chat` / `.stream_chat` | Nur, wenn die Triage sie zulässt |
| 6 | **Ablage** | `echo.py · _nachrichten_speichern` | Frage und Antwort, feldverschlüsselt |

Alle sechs sind **geteilte Funktionen**. `/chat` und `/chat/stream` sind zwei dünne
Endpunkte darüber — sie unterscheiden sich nur darin, *wie* Phase 5 abläuft. Das ist
Absicht: Sicherheitsregeln in zwei Fassungen wären die gefährlichste Dopplung im Projekt.

---

## Die vier Schichten der Sicherheit

Sie greifen unabhängig voneinander. Fällt eine aus, tragen die anderen.

### 1 · Der System-Prompt

`prompts/echo_system_prompt.md`. Verbietet Diagnosen, Aussagen über abwesende Dritte und
direktive Ratschläge („Du musst dich trennen"). Echo spricht von **Anhaltspunkten,
Tendenzen und Hypothesen** — nie von Tatsachen.

*Grenze:* Ein Prompt ist eine Bitte, keine Garantie. Deshalb die drei anderen Schichten.

### 2 · Der Keyword-Floor

`safety_service.classify_keywords`. Deterministisch, immer aktiv — **auch ohne
OpenAI-Schlüssel**. Bewusst eng auf unmissverständliche Formulierungen gefasst
(„geschlagen", „will nicht mehr leben", „vergewaltigt").

*Warum eng:* Ein breiter Filter, der bei jeder Zuspitzung anschlägt, erzeugt Lärm — und
Lärm lässt Menschen die echten Hinweise überlesen. Die Nuancen übernimmt Schicht 3.

### 3 · Die LLM-Triage

`echo_service.classify_risk`. Präzisiert Level und Kategorie. **Das höhere Risiko beider
Schichten gewinnt** (`max_level`). Fällt sie aus, greift der Floor weiter — die Krisenhilfe
funktioniert also auch, wenn OpenAI nicht erreichbar ist.

### 4 · Statische Anlaufstellen

`safety_service.CRISIS_RESOURCES`. Telefonnummern für DE, AT und CH stehen fest im Code.

> **In einer akuten Lage darf keine KI Telefonnummern halluzinieren.**

Sie stehen an **einer** Stelle. Der Paarraum formuliert seine Unterbrechung selbst (dort
sitzen zwei Menschen, nicht einer), holt die Nummern aber über `resource_block()` — sonst
veralten sie irgendwo.

---

## Die drei Stufen und was jeweils passiert

| Stufe | Wird Echo gefragt? | Was der Nutzer sieht | Metadaten |
|-------|--------------------|----------------------|-----------|
| `none` / `unclear` | ja | die normale Antwort | – |
| `elevated` | ja | die Antwort **plus** angehängter Hinweis | `mode: appended` |
| `acute` | **nein** | ausschließlich die Hilfemeldung mit Nummern | `mode: intervention` |

**`unclear` greift bewusst nicht ein.** Ein Hinweis bei jeder mehrdeutigen Formulierung
wäre genau der Lärm aus Schicht 2.

**Bei `acute` wird das Modell gar nicht erst gerufen.** Nicht „gerufen und verworfen" —
gar nicht. Es gibt keinen Pfad, auf dem eine reflektierende Deutung entsteht, während
jemand in akuter Not schreibt.

**Ausgenommen von der Triage** sind Steuerbefehle (`__…__`, Anweisungen der Oberfläche)
und der geführte Szenendialog (dort beantwortet man Fragen, man schreibt nicht frei).

---

## Streaming

Seit August 2026 läuft der freie Reflexions-Chat über `/chat/stream` (Server-Sent Events).
Vorher sah man einen Tippindikator, bis alles da war — bei einer längeren Antwort gut zehn
Sekunden Punkte.

### Was gleich bleibt

Phasen 1–4 und 6, unverändert und aus denselben Funktionen. **Die Triage läuft vollständig
ab, bevor das erste Byte rausgeht.** Das kostet eine kurze Wartezeit vor dem ersten Wort
und ist genau richtig.

### Die Reihenfolge der Ereignisse

```
data: {"typ":"beginn","safety":"acute"|"elevated"|null}
data: {"typ":"delta","text":"…"}          (viele)
data: {"typ":"fertig", …EchoChatResponse}
data: {"typ":"fehler","detail":"…"}       (statt "fertig", wenn etwas schiefgeht)
```

`beginn` steht **vor** jedem Text, und das ist kein Detail: Die Oberfläche rahmt eine akute
Hilfemeldung rot und setzt „Sicherheit zuerst – Hilfe ist erreichbar" darüber. Käme die
Einstufung erst am Schluss, sähe die Meldung während des Aufbaus aus wie eine gewöhnliche
Deutung — und bei genau dieser Nachricht ist die Aufmachung Teil der Wirkung.

### Was nie gestreamt wird

| Fall | Grund |
|------|-------|
| Steuerbefehle (`__…__`) | Anweisungen der Oberfläche, keine Fragen |
| Szenendialog | eigener Ablauf mit Extraktion am Ende |
| Zusammenfassungen, Berichte, Auswertungen | strukturierte Ergebnisse, erst ganz brauchbar |

Themen-, Blog-, Hypothesen- und Wissensdialoge **streamen mit**. Sie haben einen anderen
Systemtext, und `stream_chat` verzweigt intern darauf — genau wie `chat()`. Ohne diese
Verzweigung liefe ein geführter Dialog mit dem Prompt des freien Chats: Er klänge nur
„irgendwie anders", ohne dass etwas fehlschlüge.

Der Endpunkt antwortet mit **409**, die Oberfläche nimmt dann `/chat`. Derselbe Rückfall
greift, wenn ein Reverse Proxy den Strom nicht durchreicht. **Er ist Teil des Entwurfs,
kein Notnagel** — es gibt keine Gesprächsform, die ohne Streaming nicht funktioniert.

### Fehler und Abbruch

Alles, was fehlschlagen **kann**, passiert vor dem Strom: Kontingent, fremder Fall,
unbekannte Sitzung. Sobald die Kopfzeilen raus sind, ist kein HTTP-Fehler mehr möglich —
ein Fehler wird dann ein `fehler`-Ereignis.

Gespeichert wird **nach dem letzten Stück**. Bricht der Strom vorher ab, steht nichts in
der Datenbank: Ein halber Satz wäre ein Gesprächsverlauf, den es nie gab.

`X-Accel-Buffering: no` ist nötig, sonst puffert Caddy und liefert alles am Stück.

### Das Tempo der Anzeige

Empfangen wird so schnell wie möglich, **angezeigt** wird in Lesegeschwindigkeit
(`lib/textTakt.ts`). Ungebremst springt der Text in Schüben, statt zu entstehen — und ist
schneller da, als man ihn lesen kann.

Der Rückstand zwischen Empfangenem und Angezeigtem ist dabei **kein Problem, sondern der
Puffer**, aus dem in ruhigem Tempo geschöpft wird. Der erste Anlauf holte zu stark auf und
pendelte sich damit wieder auf die Liefergeschwindigkeit des Modells ein — also erneut zu
schnell, nur mit Umschweifen. Jetzt bleibt die Anzeige ruhig, fällt bewusst zurück und
zieht den Rest nach, wenn der Empfang beendet ist und niemand mehr wartet.

Bei `prefers-reduced-motion: reduce` steht der Text sofort vollständig da.

**Zum Nachjustieren genügt `GRUNDTEMPO`** in `lib/textTakt.ts` — kleiner ist ruhiger.

---

## Damit keine Worte verloren gehen

Die Kehrseite von „bei Abbruch wird nichts gespeichert": Der Nutzer hat den Text ja
geschrieben. Zwei Vorkehrungen fangen das ab, jede an ihrer Stelle.

**Bei einem Fehler kommt der Text zurück ins Feld.** Vorher war er vollständig weg — beim
Absenden aus dem Eingabefeld gelöscht, durch den Fehler nie angekommen, nirgends abgelegt.
Wer eine lange Nachricht geschrieben hatte, musste sie neu formulieren, ausgerechnet in dem
Moment, in dem ohnehin gerade etwas nicht funktioniert.

**Ungesendetes überlebt einen Seitenwechsel.** Das Eingabefeld hängt an `useEntwurf`
(`lib/entwurf.ts`): verzögert im Browser gespeichert, beim Wiederkommen **angeboten**, nie
von selbst eingesetzt. Nach dem Absenden gelöscht.

Beides gilt: Entwürfe liegen unverschlüsselt im Browser-Speicher. Beim Abmelden und beim
**Schnellausstieg** werden sie geräumt — und `quickExit()` schaltet zuvor jede
`beforeunload`-Nachfrage ab, denn ein Browser-Dialog würde den Bildschirm mit EchoB offen
halten, bis ihn jemand wegklickt. Bei einer Person, die gerade unbeobachtet sein muss, wäre
das die Umkehrung dessen, wofür der Knopf da ist.

---

## Wo etwas liegt

- **Nachrichten** in `echo_messages`, Inhalt feldverschlüsselt (Fernet, `crypto.encrypt`).
- **Sicherheits-Markierung** in `metadata.safety` der Assistenten-Nachricht — dadurch bleibt
  im Verlauf sichtbar, dass eine Antwort eine Intervention war.
- **Verlauf für den Prompt:** die letzten 20 Nachrichten der Sitzung.
- **Kontext wird bei jeder Nachricht frisch gebaut**, nicht zwischengespeichert. Eine
  Änderung am Profil wirkt dadurch im nächsten Satz, nicht erst im nächsten Gespräch.

---

## Welche Prüfung welche Regel bewacht

| Regel | Prüfung |
|-------|---------|
| Bei `acute` wird Echo nicht gefragt, Nummern kommen | `test_echo_stream_endpoint.py` · `test_bei_akuter_gefahr_wird_echo_nicht_gefragt` |
| `elevated` hängt an, ersetzt nicht | `test_echo_triage.py`, `test_echo_stream_endpoint.py` |
| `unclear` greift nicht ein | `test_echo_triage.py` · `test_unklar_greift_nicht_ein` |
| Steuerbefehle und Szenendialog werden nicht eingestuft | `test_echo_triage.py` (prüft auch: **keine** Modellanfrage) |
| Einstufung steht vor jedem Text | `test_echo_stream_endpoint.py` · `test_die_einstufung_kommt_vor_jedem_text` |
| Vollständiger Text gespeichert, bei Fehler gar nichts | `test_echo_stream_endpoint.py` |
| Nicht streambare Formen → 409 | `test_echo_stream_endpoint.py` |
| SSE-Format bleibt bei mehrzeiligem Text heil | `test_echo_stream_format.py` |
| Geführte Dialoge streamen mit | `test_echo_stream_endpoint.py` · `test_gefuehrte_dialoge_streamen_mit` |
| Anzeigetempo bleibt lesbar | `apps/web/tests/text-takt.test.ts` |
| Keyword-Floor und Stufenlogik | `test_safety_service.py` |

---

## Wenn du daran etwas änderst

**Die Triage-Regel steht in `_triage_pruefen` — an einer Stelle.** Sie dort zu ändern
wirkt auf beide Wege. Sie zu kopieren, weil ein Weg „etwas anders" braucht, ist der eine
Fehler, der hier wirklich schadet: Wer später eine Seite vergisst, baut einen Pfad, auf dem
jemand in akuter Not eine Deutung statt einer Notrufnummer liest.

**Das SSE-Format hängt an `json.dumps`.** Ereignisse trennt eine Leerzeile, und Echos
Antworten bestehen aus Absätzen. Dass das nicht zerfällt, liegt allein daran, dass
`json.dumps` Zeilenumbrüche escapt. Wer `_ereignis` auf einen f-String umschreibt, weil das
kürzer aussieht, bricht das Protokoll — und zwar erst bei mehrzeiligen Antworten, also
nicht in der Entwicklung.

**Neue Anlaufstellen gehören in `CRISIS_RESOURCES`, nirgendwo sonst.** Eine zweite Liste
veraltet.

**Ein neuer `thread_type` braucht eine Zuordnung in `stream_chat`.** Entweder ein eigener
Zweig mit seinem Prompt oder ein Platz in der 409-Grenze — sonst antwortet Echo dort mit
dem Systemtext des freien Dialogs, und es fällt nur daran auf, dass die Antworten
„irgendwie anders" klingen.

**Der Schnellausstieg duldet keine Nachfrage.** Wer `beforeunload` irgendwo neu einführt,
muss `fluchtLaeuft` aus `lib/entwurf.ts` berücksichtigen.

**Der Keyword-Floor darf nicht breiter werden, nur weil ein Fall durchgerutscht ist.**
Erst prüfen, ob die LLM-Triage ihn hätte fangen sollen. Ein Floor, der bei jeder Zuspitzung
anschlägt, macht die Hinweise wertlos.
