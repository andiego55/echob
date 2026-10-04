# EchoB – Rollenkarte je Funktion

> **Stand: 4. Oktober 2026 · Fassung 1.0**
>
> **Was dieses Dokument ist und was nicht.** Es ist **keine** datenschutzrechtliche
> Bewertung. Es hält fest, **wer bei welcher Funktion tatsächlich was entscheidet** — wer
> den Zweck bestimmt, wer die Mittel wählt, wessen Daten fließen und wohin. Das ist die
> Tatsachengrundlage, auf der die Einordnung nach Art. 26 oder Art. 28 DSGVO erst getroffen
> werden kann; die Einordnung selbst gehört der Anwältin oder dem DSB.
>
> **Warum es das braucht.** Die bisherige Antwort war eine Pauschale: „Route 1 = EchoB
> Verantwortliche, Route 2 = Auftragsverarbeitung." Beim Durchgehen der Funktionen trägt
> das nicht überall gleich gut. Eine Pauschalantwort, die an drei Stellen wackelt, ist
> schlechter als eine Karte, die zeigt, wo sie wackelt — und die Beratungsstunde beginnt
> dann an der richtigen Stelle.

---

## Die drei Fragen, nach denen hier sortiert wird

1. **Wer bestimmt den Zweck?** Warum wird verarbeitet — und wer hat das entschieden?
2. **Wer bestimmt die Mittel?** Insbesondere: Wer legt fest, *welche Auswertung es
   überhaupt gibt* — die Skalen, die Hypothesen-Typen, die Muster-Taxonomie?
3. **Wer kann es abstellen?** Wer beendet die Verarbeitung durch eine eigene Handlung?

Die zweite Frage ist die unbequeme. EchoB bestimmt die Methodik: Welche Skalen existieren,
welche Hypothesen gestellt werden können, welche Muster benannt werden. Eine Fachperson
wählt, **ob** sie ein Werkzeug anwendet — nicht, **was** es misst.

---

## Die Karte

| Funktion | Zweck bestimmt | Mittel/Methodik | Abstellen kann | Fließt an OpenAI | Anmerkung |
| --- | --- | --- | --- | --- | --- |
| **Konto, Anmeldung** | EchoB | EchoB | die Person (Löschen) | nein | unstreitig EchoB als Verantwortliche |
| **Szenen, Fälle, Freitexte** | die Person | EchoB | die Person | nur bei KI-Funktionen | die Person schreibt für sich selbst |
| **Echo-Dialog (eigener Bereich)** | die Person | **EchoB** (Prompts, Regeln, Modell) | die Person (Widerruf) | ja | Methodik vollständig bei EchoB |
| **Skalen, Muster** | die Person | **EchoB** (welche Skalen es gibt) | die Person | ja | hier wackelt „reiner Auftragsverarbeiter" am stärksten |
| **Hypothesen** | die Person | **EchoB** (welche Typen es gibt) | die Person | ja | wie Skalen |
| **Berichte (eigene)** | die Person | EchoB (Aufbau, Disclaimer) | die Person | ja | |
| **Podcast, Bildwerkstatt** | die Person | EchoB | die Person | ja | erzeugt neue Inhalte aus den alten |
| **Mein Kompass** | die Person | EchoB | die Person | ja | fallfrei, gehört der Person |
| **Freigabe an eine Fachperson** | die Person | EchoB (was freigebbar ist) | **die Person** (Widerruf) | — | Übergabe, nicht Verarbeitung |
| **Fachpersonen-Echo am Fall** | die Fachperson | **EchoB** | die Fachperson *und* die Klient:in | ja | die Klient:in kann die Grundlage entziehen |
| **Berichte der Fachperson** | die Fachperson | EchoB | beide | ja | |
| **Sitzungsnotizen** | **die Fachperson** | die Fachperson (Freitext) | nur die Fachperson | nein | Behandlungsdokumentation, § 630f BGB |
| **Fall-FAQ** | die Fachperson | EchoB (Fragenkatalog) | beide | ja | Katalog ist vollständig EchoBs Entscheidung |
| **Paarraum (zu zweit)** | beide Personen | EchoB | **jede der beiden** | ja | Löschung wirkt für beide — unteilbar |
| **Verzeichnis (zugestimmt)** | die Fachperson | EchoB | die Fachperson | nein | |
| **Verzeichnis (recherchiert)** | **EchoB** | EchoB | die betroffene Fachperson (Widerspruch) | nein | einzige Verarbeitung ohne Zustimmung |
| **Ausbildung (Übungsfälle)** | das Institut | EchoB | das Institut | ja | Übungsfälle sind konstruiert |

---

## Die drei Stellen, an denen die Pauschalantwort wackelt

### 1. Skalen, Muster und Hypothesen

Ein Auftragsverarbeiter verarbeitet **weisungsgebunden**. Hier bestimmt aber EchoB, *welche
Auswertungen es überhaupt gibt* — die Fachperson wählt nur, ob sie sie anwendet. Das ist das
stärkste Argument für eine gemeinsame Verantwortlichkeit (Art. 26) bei genau diesen
Funktionen.

**Dagegen spricht:** EchoB nutzt die Ergebnisse nicht für eigene Zwecke, trainiert nicht
darauf und wertet nicht quer über Fälle aus. Wer die Methodik festlegt, aber keinen eigenen
Nutzen zieht, kann immer noch Auftragsverarbeiter sein — die Frage ist, ob die Methodik
schon ein „Mittel" im Sinne von Art. 4 Nr. 7 ist.

### 2. Die Sitzungsnotizen

Sie sind der einzige Inhalt, bei dem die Fachperson **auch die Mittel** bestimmt: Freitext,
ihre Worte, ihre Struktur, keine KI. Und sie unterliegen ihrer Dokumentationspflicht nach
§ 630f BGB, die die Klient:in nicht widerrufen kann. Hier ist Art. 28 am klarsten — und
genau deshalb liegen sie im Produkt hinter einem **eigenen** Tor (`require_dokumentation`)
statt hinter der Freigabe.

### 3. Das Verzeichnis mit recherchierten Einträgen

Hier ist EchoB unstreitig **allein verantwortlich**, und die betroffenen Fachpersonen sind
Dritte, die nie gefragt wurden. Das hat mit den anderen Zeilen nichts zu tun und wird
leicht übersehen, weil es im selben Produkt steckt.

---

## Was das praktisch bedeutet, egal wie die Einordnung ausfällt

Diese vier Dinge gelten in beiden Lesarten und sind gebaut:

- Die Klient:in kann die Grundlage **jederzeit entziehen** — Freigabe widerrufen,
  KI-Einwilligung widerrufen, Fall oder Konto löschen.
- Die Fachperson kommt **an nichts heran, was nicht freigegeben ist** — erzwungen an einer
  Stelle (`sharing_service`), nicht in jedem Endpunkt einzeln.
- EchoB nutzt die Inhalte **nicht für eigene Zwecke**: kein Training, keine Auswertung über
  Fälle hinweg, keine Weitergabe.
- Alle Dienstleister stehen im AVV mit Zweck, Ort und Garantie.

## Offen — für die anwaltliche Prüfung

1. Reicht „EchoB legt die Methodik fest" für eine gemeinsame Verantwortlichkeit nach
   Art. 26 bei Skalen, Mustern und Hypothesen?
2. Falls ja: Braucht es eine Vereinbarung nach Art. 26 Abs. 1 **neben** dem AVV — und wie
   wird sie den betroffenen Personen zugänglich gemacht (Art. 26 Abs. 2)?
3. Ist die unterschiedliche Einordnung **je Funktion** praktikabel, oder wäre eine
   einheitliche Antwort trotz der Unschärfe die bessere?
4. Wie ist der Ausbildungsbereich einzuordnen, solange Übungsfälle konstruiert sind —
   und was ändert sich, wenn ein Institut echte Fälle einbrächte?
