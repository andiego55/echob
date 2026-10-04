# EchoB – Zweckbestimmung

> **Stand: 4. Oktober 2026 · Fassung 1.0**
>
> Dieses Dokument ist die **Zweckbestimmung des Herstellers**. Es ist keine Rechtsberatung
> und keine Konformitätserklärung; es hält fest, wofür EchoB bestimmt ist und wofür
> ausdrücklich nicht — und zwar an einer Stelle, nachvollziehbar und datiert.
>
> **Warum es das gibt.** Ob eine Software ein Medizinprodukt ist, entscheidet sich an der
> Zweckbestimmung des Herstellers. Wäre EchoB eines, käme nach der Klassifizierungsregel
> für Software, die Entscheidungen zu diagnostischen oder therapeutischen Zwecken liefert,
> eine Einstufung mit Benannter Stelle in Betracht. Das ist das größte einzelne
> Rechtsrisiko dieser Produktklasse, und es hängt nicht an der Technik, sondern an dem,
> was wir über sie sagen. Ein verstreutes „ersetzt keine Therapie" auf zwölf Seiten ist
> gelebte Praxis; ein Dokument ist der Nachweis.

---

## 1. Wofür EchoB bestimmt ist

EchoB ist ein **Werkzeug zur Selbstreflexion und zur Strukturierung eigener Erfahrungen**
für erwachsene Menschen in belastenden Beziehungssituationen.

Bestimmungsgemäß dient es dazu,

- eigene Erlebnisse als **Szenen** festzuhalten und zu ordnen,
- die eigene Wahrnehmung zu sortieren — Beobachtung, Gefühl und Deutung zu trennen,
- **wiederkehrende Muster** in den eigenen Aufzeichnungen sichtbar zu machen,
- sich auf ein Gespräch mit einer Fachperson **vorzubereiten** und ihr auf Wunsch
  ausgewählte Inhalte zu übergeben,
- den eigenen Verlauf über die Zeit nachvollziehbar zu halten.

Die Zielgruppe sind **Laien in eigener Sache**. Im Fachpersonenbereich dient es Beraterinnen
und Therapeuten als **Dokumentations- und Vorbereitungswerkzeug** für Material, das ihnen
ihre Klient:innen ausdrücklich freigegeben haben.

## 2. Wofür EchoB ausdrücklich nicht bestimmt ist

EchoB ist **nicht** bestimmt

- zur **Diagnose**, Erkennung oder Ausschließung einer Krankheit oder Störung — weder bei
  der nutzenden Person noch bei einer von ihr beschriebenen dritten Person,
- zur **Behandlung**, Linderung oder Heilung einer Krankheit,
- zur **Überwachung** eines Krankheitsverlaufs oder physiologischer Vorgänge,
- zur **Vorhersage oder Prognose** eines Krankheitsverlaufs,
- als **Entscheidungsgrundlage für eine Behandlung** oder deren Unterlassung,
- zur **Triage**, Risikoeinstufung oder Notfallversorgung,
- als Ersatz für Psychotherapie, ärztliche Behandlung, Beratung oder Notfallhilfe.

Das Produkt gibt an keiner Stelle Handlungsanweisungen in Beziehungs- oder
Gesundheitsfragen („trenne dich", „nimm Medikamente", „suche keine Hilfe").

## 3. Die drei Funktionen, die am nächsten an der Grenze liegen

Hier liegt die eigentliche Arbeit. Es wäre bequem, nur das Gesamtprodukt zu beschreiben;
was zählt, sind die Stellen, an denen jemand etwas anderes hineinlesen könnte.

### 3.1 Hypothesen

EchoB führt geführte Dialoge, aus denen **Hypothesen** entstehen — etwa zu Bindungsmustern
oder Konfliktdynamiken.

**Warum das keine Diagnostik ist:** Die Hypothesen sind ausdrücklich **tastend** formuliert,
beziehen sich auf die **Dynamik zwischen Menschen** und nicht auf eine Person als Trägerin
einer Störung, und sie nennen keine Krankheitsbilder als Befund. Das ist im System-Prompt
verankert und nicht nur im Oberflächentext. Die Ergebnisse sind als **Anhaltspunkte**
bezeichnet, ausdrücklich fehlbar, und sie werden der Person selbst gezeigt — nicht einer
Stelle, die daraufhin über sie entscheidet.

**Was die Einordnung kippen würde:** eine Hypothese, die ein Krankheitsbild benennt und
einer Person zuordnet. Dagegen steht nicht nur der Prompt, sondern auch, dass
Charakterwerte bewusst aus der Bildsprache herausgehalten sind.

### 3.2 Skalen

EchoB berechnet **Skalenwerte** zu Mustern wie „Schuld, die bei mir landet".

**Warum das keine Diagnostik ist:** Die Skalen sind **keine validierten klinischen
Instrumente** und geben sich auch nicht als solche aus. Sie verdichten, was die Person
selbst aufgeschrieben hat, in eine Übersicht; sie haben keine Schwellenwerte mit
Krankheitswert, keine Normstichprobe und keinen Cut-off, ab dem etwas „vorliegt".

**Was die Einordnung kippen würde:** ein Schwellenwert mit einer Aussage („ab 70 liegt eine
depressive Episode nahe") oder die Behauptung einer Validierung.

### 3.3 Die Krisenlogik und `safety_status`

EchoB erkennt Anzeichen akuter Belastung und zeigt dann **Krisennummern**.

**Das ist die Funktion, die am nächsten an „Überwachung" liegt**, und sie ist deshalb am
engsten gefasst: Sie trifft **keine Risikoeinstufung**, die eine Versorgungsentscheidung
trägt. Sie schlägt keine Behandlung vor, sie priorisiert nicht, sie meldet nichts an Dritte.
Sie tut genau eins: Sie legt eine Telefonnummer daneben. Eine Hilfeadresse zu zeigen ist
keine medizinische Zweckbestimmung — sonst wäre jede Website mit einem Krisentelefon im
Fuß ein Medizinprodukt.

**Was die Einordnung kippen würde:** eine Einstufung in Risikostufen, eine automatische
Benachrichtigung einer Fachperson „wegen akuter Gefahr", oder eine Empfehlung, die über
„hier gibt es Hilfe" hinausgeht.

## 4. Was die Abgrenzung praktisch trägt

Eine Zweckbestimmung, die nur behauptet wird, ist nichts wert. Diese hier wird getragen von:

| Maßnahme | Wo |
| --- | --- |
| Pflicht-Vorbehalt auf **jeder** öffentlichen Seite | Footer, deshalb auf allen 617 Seiten |
| „Kein Medizinprodukt, keine Diagnosen" | Impressum, AGB § Leistungsbeschreibung |
| Disclaimer in jedem erzeugten Bericht | `REPORT_DISCLAIMER` |
| „tastend, keine Diagnose" als Prompt-Regel | System-Prompts der Hypothesen-Dialoge |
| Keine Charakterwerte in der Bildsprache | `bild_katalog`, eigener Wächter |
| Krisenhinweis statt Einstufung | Krisenlogik, `/wissen/krisentelefone` |
| Liste verbotener und erlaubter Formulierungen | `docs/safety-and-claims.md`, Wächter |
| Keine Werbung mit Heilung oder Wirksamkeit | Marketing-Wächter |

## 5. Was diese Einordnung ändern würde

Damit es nicht nebenbei passiert — jede dieser Änderungen wäre eine Entscheidung mit
Rechtsfolge und gehört vorher geprüft:

1. Eine Aussage, die ein **Krankheitsbild** einer Person zuordnet.
2. Ein **Schwellenwert** mit Krankheitswert oder eine behauptete **Validierung** der Skalen.
3. Eine **Empfehlung zur Behandlung** oder zu ihrem Unterlassen.
4. Eine **Risikoeinstufung**, die eine Versorgungsentscheidung trägt.
5. **Werbung mit Wirksamkeit** („klinisch erwiesen", „hilft gegen Depression").
6. Eine Ausrichtung auf **Minderjährige** — EchoB ist ausdrücklich ab 18.
7. Die Abgabe an **Fachpersonen als Entscheidungsgrundlage** statt als Vorbereitungs- und
   Dokumentationsmaterial.

Punkt 5 ist der wahrscheinlichste: Er passiert nicht in einer Produktentscheidung, sondern
in einem Marketingtext, den jemand schnell schreibt. Deshalb steht dafür ein Wächter.

## 6. Offen — für die anwaltliche Prüfung

- Trägt diese Zweckbestimmung die Abgrenzung, insbesondere bei der Krisenlogik?
- Ist die Formulierung im Fachpersonenbereich tragfähig, wo das Material in eine
  Behandlung einfließt — auch wenn EchoB dort nur Dokumentationswerkzeug ist?
- Berührt die Wirksamkeitsstudie (`/forschung`) die Zweckbestimmung? Eine Studie, die
  Wirksamkeit **zeigen** soll, ist etwas anderes als eine, die Wirksamkeit **behauptet** —
  die Grenze verläuft in der Kommunikation darüber.
- Heilmittelwerberecht: Greift es, solange kein Medizinprodukt und keine Heilbehandlung
  beworben wird?
