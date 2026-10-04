# EchoB – Erlaubte und nicht erlaubte Claims

Dieses Dokument gilt für alle Texte: Website, App, Marketing, AI-Outputs, Reports, E-Mails.

> **Seit 04.10.2026 wird es erzwungen, nicht nur gelesen.** `apps/web/tests/claims.test.ts`
> liest die Verbotstabelle unten und prüft die Seiten, auf denen EchoB in **eigener Stimme**
> spricht. Die Wissensplattform ist ausgenommen: Dort geht es sachlich um Narzissmus,
> Gaslighting und Diagnosen, und ein Wortfilter darüber wäre dasselbe Unglück wie das Wort
> „eye" im Bildregie-Filter, das einmal jeden Bildauftrag abgelehnt hat.
>
> Warum das hier hängt und nicht an einem guten Vorsatz: Ob EchoB ein Medizinprodukt ist,
> entscheidet sich an dem, was wir über das Produkt **sagen**. Es kippt nicht in einer
> Produktentscheidung, sondern in einem Marketingtext, den jemand schnell schreibt. Die
> ausführliche Begründung steht in [`zweckbestimmung.md`](zweckbestimmung.md).

---

## Nicht erlaubt

Diese Formulierungen dürfen in keiner Form verwendet werden:

| Nicht erlaubt                                              | Warum                                               |
|------------------------------------------------------------|-----------------------------------------------------|
| „Wir diagnostizieren Narzissmus."                          | Diagnose – nicht zulässig ohne Lizenz               |
| „Die App erkennt Borderline."                              | Diagnose / falsche Versprechung                     |
| „Finde heraus, ob dein Partner Cluster B hat."             | Diagnose, stigmatisierend                           |
| „Die App ersetzt Therapie."                                | Falsch und rechtlich problematisch                  |
| „Du musst dich trennen."                                   | Direktive, übergriffig                              |
| „Wir wissen, was wirklich passiert ist."                   | Anmaßung, nicht haltbar                             |
| „Dein Partner ist Narzisst."                               | Diagnose einer dritten Person                       |
| „Du bist ein Opfer von Gaslighting."                       | Diagnose / Bewertung ohne Kontext                   |
| „EchoB kann Missbrauch feststellen."                       | Diagnose / rechtlich riskant                        |
| „Unsere KI erkennt toxische Persönlichkeiten."             | Diagnose, stigmatisierend, nicht haltbar            |

---

## Erlaubt

Diese Formulierungen sind zulässig und entsprechen dem Produktprinzip:

| Erlaubt                                                                      | Kontext              |
|------------------------------------------------------------------------------|----------------------|
| „EchoB hilft, belastende Beziehungsmuster zu strukturieren."                 | Allgemein            |
| „EchoB kann Hinweise auf wiederkehrende Dynamiken sichtbar machen."          | Feature-Beschreibung |
| „EchoB unterstützt bei der Vorbereitung auf Coaching, Beratung oder Therapie." | Positionierung     |
| „EchoB ersetzt keine professionelle Hilfe."                                  | Disclaimer           |
| „Mögliche Muster in deiner Beziehungssituation reflektieren."                | Feature-Beschreibung |
| „Deine Wahrnehmung sortieren und strukturieren."                             | Feature-Beschreibung |
| „Beobachtung, Gefühl und Interpretation besser trennen."                     | Feature-Beschreibung |
| „Wiederkehrende Dynamiken in der Übersicht sehen."                           | Feature-Beschreibung |
| „Einen strukturierten Bericht für das Erstgespräch erstellen."               | Feature-Beschreibung |
| „EchoB ist kein Ersatz für Therapie oder Beratung."                         | Disclaimer           |
| „Bei akuter Gefahr wende dich an Notfallstellen."                            | Sicherheitshinweis   |

---

## Pflicht-Disclaimer

Dieser Text muss auf allen öffentlichen Seiten und in allen Reports erscheinen:

> EchoB ersetzt keine Psychotherapie, Diagnostik oder Notfallhilfe.
> In einer Krise: [Notruf & Krisennummern](https://echo-b.de/wissen/krisentelefone).

**Umgesetzt ist das im Fuß** (`components/layout/Footer.tsx`) — also auf allen 617 Seiten
auf einmal, statt Seite für Seite. Genau deshalb hält es: Eine Pflicht, die an einer Stelle
hängt, kann man nicht auf einer neuen Seite vergessen.

*Die Nummern stehen nicht im Fuß, sondern auf der verlinkten Seite.* Das ist eine bewusste
Änderung gegenüber der ersten Fassung dieses Dokuments: Zwei Nummern in einer Fußzeile
helfen weniger als eine Seite, die nach Lage und Situation sortiert — und ein Dokument, das
etwas anderes verlangt, als das Produkt tut, ist entweder falsch oder macht das Produkt
falsch.

---

## AI-Outputs

Alle AI-generierten Texte (Reflexionsdialog, Musterübersicht, Reports) müssen:

- keine Diagnosen stellen
- keine Personen benennen oder beurteilen
- Muster als Beobachtungshypothesen formulieren, nicht als Fakten
- immer auf professionelle Hilfe hinweisen, wenn Leid erkennbar ist
- Krisenhinweise ausgeben, wenn Anzeichen für akute Belastung vorhanden sind

System-Prompt-Kontrolle: Der AI-System-Prompt muss diese Regeln explizit enthalten.
