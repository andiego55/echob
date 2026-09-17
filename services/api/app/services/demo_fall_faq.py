"""Die Fall-FAQ der beiden Beispielfälle — vierzig Antworten je Fall und ein Merkmalsbild.

**Warum vorbereitet und nicht erzeugt.** Die Spielwiese soll zeigen, was das Fragenpaket
leistet, ohne dass eine fiktive Klient:in es auslösen kann und ohne dass jede neue
Fachperson einen Modelllauf kostet. Die Antworten stehen deshalb hier — geschrieben so, wie
ein gelungener Lauf sie liefern soll: dicht, mit wörtlichen Belegen, mit Gegenbelegen, und
mit ehrlicher Materiallage.

**Was sie vorführen.** Nicht nur Treffer. Einige Fragen sind bewusst ``duenn`` oder
``keine`` beantwortet, einige Achsen haben zu wenige Belege für eine Zahl, und im Fall
Marco ist keiner der vier Anteile beurteilbar. Das ist die Stelle, an der eine Fachperson
lernt, wie das Produkt mit einseitigem und dünnem Material umgeht — ein Beispielfall, in
dem alles belegt ist, würde das Gegenteil lehren.

**Dieselbe Prüfung wie echte Läufe.** Die Antworten gehen beim Anlegen durch
``fall_faq_service.vorbereiteten_lauf_ablegen`` und damit durch dieselben Prüfregeln wie
eine Modellantwort. Die Tests verlangen zusätzlich mehr, als die Prüfung im Betrieb kann:
jedes Zitat wörtlich in der genannten Szene (``demo_inhalt.py``), höchstens 25 Wörter.

Personen außer Lena und Marco stehen in den Antworten nur als Rolle („die Schwester",
„ein Kollege"), so wie der Katalog es vom Modell verlangt; in den Zitaten stehen sie so, wie
die Szene sie nennt.
"""
from __future__ import annotations

from dataclasses import dataclass

Beleg = tuple[int, str]


@dataclass(frozen=True)
class Antwort:
    #: ``gut`` | ``duenn`` | ``keine`` — wie im Katalog.
    lage: str
    text: str
    belege: tuple[Beleg, ...] = ()
    gegenbelege: tuple[Beleg, ...] = ()


@dataclass(frozen=True)
class Auspraegung:
    wert: int
    begruendung: str
    belege: tuple[Beleg, ...] = ()
    gegenbelege: tuple[Beleg, ...] = ()


@dataclass(frozen=True)
class FallFaq:
    antworten: dict[str, Antwort]
    achsen: dict[str, Auspraegung]
    materiallage: dict[str, str]

    def als_modellantworten(self) -> list[dict]:
        """Dieselbe Form, die ``echo_service.fall_faq_antworten`` liefert."""
        return [
            {
                "frage_id": fid, "antwort": a.text, "materiallage": a.lage,
                "belege": [{"szene_nr": n, "zitat": z} for n, z in a.belege],
                "gegenbelege": [{"szene_nr": n, "zitat": z} for n, z in a.gegenbelege],
            }
            for fid, a in self.antworten.items()
        ]

    def als_merkmalsantwort(self) -> dict:
        """Dieselbe Form, die ``echo_service.fall_faq_merkmale`` liefert."""
        return {
            "achsen": [
                {
                    "achse_id": aid, "wert": a.wert, "begruendung": a.begruendung,
                    "belege": [{"szene_nr": n, "zitat": z} for n, z in a.belege],
                    "gegenbelege": [{"szene_nr": n, "zitat": z} for n, z in a.gegenbelege],
                }
                for aid, a in self.achsen.items()
            ],
            "materiallage": dict(self.materiallage),
        }


# ═════════════════════════════════════════════════════════════════════════════
# Lena — nutzende Person Lena, Fallperson Marco
# ═════════════════════════════════════════════════════════════════════════════

_LENA_AUFTRAG_BIS_VERLAUF = {
    # ── Auftrag & Anliegen ───────────────────────────────────────────────────
    "anliegen_kern": Antwort(
        "gut",
        "Lena will nach der Trennung verstehen, was in zweieinhalb Jahren Beziehung passiert "
        "ist, und wieder ihrer eigenen Wahrnehmung trauen. Im Kern steht weniger die Trennung "
        "selbst als der Zweifel an sich, der sie überdauert: Eine knappe Nachricht Marcos "
        "genügt, und sie fragt sich zwei Tage lang, ob sie das Problem war. Schon während der "
        "Beziehung brauchte sie Belege, um sich selbst zu glauben.",
        belege=(
            (25, "Ob ich das Problem war."),
            (3, "Und erschrocken darüber, dass ich eine Nachricht brauchte, um mir selbst zu glauben."),
            (19, "Du entschuldigst dich seit zwei Jahren für Dinge, die er macht."),
        ),
    ),
    "anliegen_ziel": Antwort(
        "gut",
        "Ausdrücklich nennt Lena zwei Ziele: verstehen, was passiert ist, und der eigenen "
        "Wahrnehmung wieder trauen. Erschließen lässt sich ein drittes, das sie nicht selbst "
        "benennt: Kontakt zu Marco aushalten zu können, ohne jedes Mal in das alte Muster "
        "gezogen zu werden — das noch offene gemeinsame Konto macht solche Kontakte "
        "unvermeidlich. Die jüngsten Szenen zeigen, wie ein gutes Ergebnis aussehen könnte: "
        "kurze, sachliche Antworten, die sie als ihre eigenen erlebt.",
        belege=(
            (23, "Jeder Kontakt zieht mich kurz zurück ins alte Muster."),
            (23, "Aber die dritte Mail war meine."),
            (25, "Und ein bisschen stolz auf den einen Satz."),
        ),
    ),
    "anliegen_versucht": Antwort(
        "gut",
        "Das Material zeigt mehrere Lösungsversuche, die während der Beziehung überwiegend "
        "gescheitert sind. Lena hat Konflikte angesprochen und ist auf Schweigen gestoßen "
        "(Szene 7), hat Belege gesammelt, um sich gegen Umdeutungen zu behaupten (Szene 3), und "
        "eine Paarberatung vorgeschlagen, die Marco als ihr Problem zurückgewiesen hat "
        "(Szene 14). Wirksam war erst der Weg nach außen: Das offene Gespräch mit der Schwester "
        "ging der Trennung unmittelbar voraus. Einen Versuch sieht sie selbst kritisch — die "
        "Trennungsdrohung als Hebel, die kurzfristig wirkte (Szenen 15 und 16).",
        belege=(
            (7, "Heute habe ich zum dritten Mal gefragt, ob wir reden können. Er hat den Fernseher lauter gemacht."),
            (14, "Mit dir und deinen Problemen müsste man da hin, nicht mit mir."),
            (19, "Wir haben bis drei Uhr nachts geredet."),
            (15, "Ich merke, dass ich ihn benutze."),
        ),
    ),
    "anliegen_erwartung": Antwort(
        "duenn",
        "Erwartungen an eine Fachperson äußert Lena im Material nicht. Indirekt lässt sich "
        "eine Vorerfahrung lesen, die das Erstgespräch prägen kann: Der einzige frühere "
        "Versuch, sich Hilfe zu holen, wurde in der Beziehung gegen sie gewendet. Möglich ist, "
        "dass sie vor allem die Bestätigung sucht, sich nichts einzubilden, und empfindlich "
        "reagiert, wenn Fragen nach ihrem Anteil wie ein Zweifel an ihrer Wahrnehmung "
        "klingen. Das ist eine Vermutung aus dem Material, keine Aussage von ihr.",
        belege=(
            (14, "Sogar der Versuch, Hilfe zu holen, ist mein Fehler geworden."),
        ),
    ),

    # ── Beziehungsdynamik ────────────────────────────────────────────────────
    "dyn_zyklus": Antwort(
        "gut",
        "Ein wiederkehrender Ablauf ist deutlich erkennbar. Auslöser sind Momente, in denen "
        "Lena eigenständig handelt oder Kritik äußert. Es folgen eine Spitze, ein Vorwurf oder "
        "Schweigen über Tage bis Wochen. Der Bruch endet nicht durch Klärung, sondern damit, "
        "dass Lena sich entschuldigt oder Marco mit einer großen Geste zurückkehrt, nach der "
        "über den Anlass nicht mehr gesprochen wird. Die Episode um den Geburtstag zeigt alle "
        "Stufen innerhalb von zwei Wochen; nach der Trennung wiederholt sich die Bewegung "
        "verdichtet über Nacht. Die Monate nach der Trennungsdrohung unterbrechen den Ablauf, "
        "beenden ihn aber nicht.",
        belege=(
            (6, "Ich wollte dich überraschen, und du bist einfach nur undankbar."),
            (7, "Er sagt dem Kater Guten Morgen, mir nicht."),
            (8, "Lass uns das Wochenende nicht kaputtmachen."),
            (8, "Wir haben nie wieder darüber gesprochen."),
            (21, "Ich sei die Liebe seines Lebens, er bitte nur um ein Gespräch."),
        ),
        gegenbelege=(
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "dyn_rollen": Antwort(
        "gut",
        "Überwiegend verfolgt Lena, und Marco distanziert sich: Sie sucht das Gespräch, er "
        "schweigt oder wechselt das Thema. An einer Stelle kehren sich die Rollen deutlich um — "
        "wenn Lena mit Trennung droht oder tatsächlich geht, wird Marco zum Verfolger, fleht "
        "und schreibt nachts lange Nachrichten. Distanz ist damit vor allem Marcos Mittel, "
        "solange die Beziehung sicher scheint; sobald sie gefährdet ist, kippt es.",
        belege=(
            (7, "Heute habe ich zum dritten Mal gefragt, ob wir reden können."),
            (3, "Können wir jetzt bitte über was anderes reden?"),
            (15, "Er hat sich in der Küche auf den Boden gesetzt und gesagt, dass er alles ändert"),
            (21, "Ich sei die Liebe seines Lebens, er bitte nur um ein Gespräch."),
        ),
    ),
    "dyn_ende": Antwort(
        "gut",
        "Die häufigste Form ist Nachgeben: Konflikte enden damit, dass Lena sich entschuldigt, "
        "oft ohne benennen zu können, wofür. Die zweite Form ist Überdecken — eine Geste oder "
        "ein Frühstück, nach dem der Anlass nicht mehr berührt wird. Eine Klärung kommt im "
        "Material nicht vor. Die Ausnahme ist Lenas Trennungsdrohung, nach der sich für einige "
        "Monate tatsächlich etwas ändert, ohne dass der alte Konflikt je besprochen wird.",
        belege=(
            (2, "Ich habe mich entschuldigt. Wofür genau, wusste ich nicht."),
            (6, "Am nächsten Morgen habe ich mich für den Streit entschuldigt."),
            (18, "Über die Nacht hat er kein Wort verloren. Ich auch nicht."),
            (19, "Du entschuldigst dich seit zwei Jahren für Dinge, die er macht."),
        ),
        gegenbelege=(
            (16, "Seit dem Abend im Februar ist Marco wie ausgewechselt."),
        ),
    ),
    "dyn_reparatur": Antwort(
        "gut",
        "Reparatur im Sinne einer Klärung bleibt durchgängig aus; das gehört zu den "
        "deutlichsten Befunden des Materials. Auf Verletzungen folgen Zuwendungsschübe — "
        "Blumen, eine Reise, ein Frühstück mit Kerzen —, die Nähe wiederherstellen, den "
        "Vorfall aber ausklammern. Versuche Lenas, den Anlass nachträglich anzusprechen, "
        "werden abgewehrt. Die ruhigen Monate 2025 sind die einzige anhaltende Veränderung, "
        "auch sie ohne Aufarbeitung des Vorangegangenen.",
        belege=(
            (8, "Lass uns das Wochenende nicht kaputtmachen."),
            (8, "Wir haben nie wieder darüber gesprochen."),
            (18, "Am ersten Feiertag hat er Frühstück gemacht, mit Kerzen."),
            (3, "Dann habe ich mich missverständlich ausgedrückt."),
        ),
        gegenbelege=(
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "dyn_kipppunkt": Antwort(
        "gut",
        "Reproduzierbar kippt es, wenn Lena sich eigenständig bewegt: ein Treffen mit der "
        "besten Freundin, der eigene Geburtstag mit ihren Leuten, die erste Dienstreise als "
        "Abteilungsleiterin. In allen drei Situationen folgen Abwertung oder Rückzug, beim "
        "letzten Mal unmittelbar nach einer Phase echter Zuwendung. Ein zweiter Kipppunkt ist "
        "Kritik an Marcos Verhalten, die regelmäßig in einen Vorwurf an Lena umgedeutet wird. "
        "Den ersten Kipppunkt hat Lena so verinnerlicht, dass sie Treffen vorsorglich "
        "verschweigt.",
        belege=(
            (4, "Seit er sagt, dass sie mich runterzieht, ist es so einfach leichter."),
            (6, "Er hat den Umschlag wieder eingesteckt."),
            (17, "Na, wie war's mit deinen wichtigen Leuten?"),
            (15, "mit deiner Seelsorgerin setze ich mich nicht an einen Tisch"),
            (14, "Geh du ruhig. Dann erzählst du denen wenigstens nicht, dass alles an mir liegt."),
        ),
    ),

    # ── Verlauf & Wendepunkte ────────────────────────────────────────────────
    "verl_entwicklung": Antwort(
        "gut",
        "Die Szenen reichen von September 2023 bis Juli 2026 und zeigen vier Phasen. Die "
        "ersten Wochen sind von überschießender Zuwendung geprägt, nach zwei Monaten folgen "
        "erste Abwertungen und Umdeutungen. Ab dem Zusammenziehen im Februar 2024 verdichten "
        "sich Kontrolle, Schweigen und Spott vor Dritten; die Belastungsangaben liegen "
        "überwiegend bei 4 und 5. Nach Lenas Trennungsdrohung im Februar 2025 folgt eine "
        "mehrmonatige ruhige Phase, die im September 2025 endet und in die Trennung im Februar "
        "2026 mündet. Danach verlagert sich das Geschehen auf Nachrichten, das gemeinsame Konto "
        "und den Freundeskreis.",
        belege=(
            (1, "Nach drei Wochen hat er gesagt, er habe noch nie jemanden getroffen, der ihn so versteht, wir seien Seelenverwandte."),
            (2, "Das war peinlich naiv, wie du das erzählt hast."),
            (5, "Seit Februar wohne ich bei Marco."),
            (16, "Seit dem Abend im Februar ist Marco wie ausgewechselt."),
            (17, "Danach zwei Tage kaum ein Wort."),
            (20, "Ich beende unsere Beziehung. Ich ziehe heute zu Katrin."),
        ),
    ),
    "verl_wendepunkt": Antwort(
        "gut",
        "Zwei Ereignisse markieren einen erkennbaren Unterschied. Heiligabend 2025 verändert "
        "Lenas Deutung: Sie beschreibt sich danach zum ersten Mal eher traurig als schuldig. "
        "Wenige Wochen später erzählt sie der Schwester erstmals alles — das ist der zweite "
        "Wendepunkt, denn er bricht die Geheimhaltung, und die Trennung folgt sechs Wochen "
        "darauf, vorbereitet und begleitet. Bemerkenswert ist, dass die Wende nicht aus einem "
        "Höhepunkt der Belastung entsteht, sondern aus einer Außensicht.",
        belege=(
            (18, "Zum ersten Mal eher traurig als schuldig."),
            (19, "Ich wusste es nicht. Oder ich wusste es und habe es nicht gehört, solange es nur in meinem Kopf war."),
            (20, "Ich hatte es mit Katrin vorbereitet."),
        ),
    ),
    "verl_gut": Antwort(
        "gut",
        "In der Beziehung gibt es zwei deutliche Ausnahmen. Während des Herzinfarkts von Lenas "
        "Vater war Marco verlässlich, praktisch und zugewandt — in einer Lage, in der Lena ihn "
        "brauchte und keine eigenen Wege ging. Die zweite Phase, Februar bis September 2025, "
        "folgt auf Lenas Trennungsdrohung: Marco fragt nach, kocht und lädt die beste Freundin "
        "ein. Beiden Phasen ist gemeinsam, dass Lenas Eigenständigkeit gerade nicht im Raum "
        "stand oder die Beziehung spürbar gefährdet war. Der zweiten Phase traut Lena selbst "
        "nicht und beobachtet sie angespannt.",
        belege=(
            (9, "In diesen drei Tagen war er genau der Mensch, in den ich mich verliebt habe."),
            (16, "Letzten Sonntag hat er Mira zum Essen eingeladen und war den ganzen Abend charmant."),
            (16, "Stattdessen warte ich die ganze Zeit darauf, dass es kippt."),
        ),
    ),
    "verl_richtung": Antwort(
        "gut",
        "Während der Beziehung steigt die Belastung von 1 in der ersten Szene auf überwiegend "
        "4 bis 5 ab 2024; Heiligabend 2025 erreicht den Höchstwert. Die ruhige Phase im "
        "Frühjahr 2025 fällt auf 2. Nach der Trennung schwanken die Werte zwischen 1 und 4: "
        "Ein unbeschwerter Tag mit der besten Freundin steht neben zwei Tagen Grübeln nach "
        "einer einzigen Nachricht. Die Richtung ist damit eher fallend, aber nicht stabil — "
        "Kontakte zu Marco lösen weiterhin kurze Einbrüche aus.",
        belege=(
            (1, "Verliebt wie mit zwanzig."),
            (18, "Erschöpft und seltsam klar."),
            (24, "Leicht. So kann es sich also anfühlen."),
            (25, "Das hat für zwei Tage gereicht."),
        ),
    ),
}

_LENA_PERSON_UND_BINDUNG = {
    # ── Persönlichkeitsnahe Anhaltspunkte ────────────────────────────────────
    "pers_zuege": Antwort(
        "gut",
        "Wiederholt treten drei beobachtbare Muster hervor. Erstens reagiert Marco auf Kritik "
        "und auf Lenas Eigenständigkeit mit Abwertung, Spott oder Schweigen. Zweitens wird "
        "Lenas Wahrnehmung für falsch erklärt, oft mit dem Satz, sie sei zu empfindlich oder "
        "denke sich Dinge aus. Drittens zeigt sich in Krisen, in denen Lena ihn braucht, ein "
        "verlässlich fürsorgliches Verhalten. Alle drei sind Anhaltspunkte aus Lenas "
        "Schilderung; das dritte ist der wichtigste Gegenbeleg gegen ein einseitiges Bild.",
        belege=(
            (10, "Das war ein Witz. Du bist echt zu empfindlich."),
            (3, "Du denkst dir Sachen aus, Lena. Das machst du öfter."),
            (12, "Er hat meine Stimme nachgemacht, hoch und weinerlich"),
            (17, "Danach zwei Tage kaum ein Wort."),
        ),
        gegenbelege=(
            (9, "Marco hat nicht gefragt, sondern die Schlüssel genommen."),
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "pers_idealisierung": Antwort(
        "gut",
        "Ein Wechsel von Aufwertung und Abwertung ist gut belegt, und zwar in zwei Formen. Früh "
        "in der Beziehung stehen überschießende Zuwendung und erste Herabsetzungen im Abstand "
        "weniger Wochen nebeneinander. Später folgen Aufwertungen auffällig oft auf einen Bruch "
        "— nach zwei Wochen Schweigen, bei der Trennung, in der nächtlichen Nachricht danach — "
        "und werden im selben Zug von Abwertung oder Forderungen abgelöst. Gegen ein reines "
        "Muster spricht die Phase 2025, in der die Zuwendung über Monate beständig und "
        "alltäglich war, ohne übersteigert zu wirken.",
        belege=(
            (1, "wir seien Seelenverwandte"),
            (2, "Das war peinlich naiv, wie du das erzählt hast."),
            (8, "er sei ein Idiot, er könne ohne mich nicht leben, ich sei das Beste, was ihm je passiert ist"),
            (20, "Ohne mich schaffst du das nicht. Du hast doch niemanden mehr."),
            (21, "Das ist ja wohl das Mindeste."),
        ),
        gegenbelege=(
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "pers_kritik": Antwort(
        "gut",
        "Das Material enthält mehrere Situationen, in denen Lena widerspricht, eine Grenze "
        "setzt oder etwas verweigert. Danach folgt regelhaft eine von drei Reaktionen: Umkehr "
        "des Vorwurfs (sie sei undankbar, empfindlich, habe etwas zu verbergen), Schweigen über "
        "Tage oder Herabsetzung. Bei der Trennung zeigen sich alle drei innerhalb einer Stunde, "
        "dazu ein kurzes Versperren der Tür. Die einzige Ausnahme ist Lenas Trennungsdrohung im "
        "Februar 2025, auf die Marco mit dem Versprechen reagiert, sich zu ändern — und es über "
        "Monate einlöst.",
        belege=(
            (6, "Ich wollte dich überraschen, und du bist einfach nur undankbar."),
            (7, "Tag neun, seit ich gesagt habe, dass es nicht in Ordnung war"),
            (11, "Was hast du zu verbergen?"),
            (12, "Mit dir kann man echt keinen Spaß mehr haben."),
            (20, "Als ich meine Jacke genommen habe, hat er sich vor die Wohnungstür gestellt."),
        ),
        gegenbelege=(
            (15, "Er hat sich in der Küche auf den Boden gesetzt und gesagt, dass er alles ändert"),
        ),
    ),
    "pers_selbstbild": Antwort(
        "duenn",
        "Hierzu erlaubt das Material nur vorsichtige Anhaltspunkte, weil Marcos Selbstbild in "
        "Lenas Szenen fast nur indirekt sichtbar wird. Auf Kränkbarkeit deutet, dass schon ein "
        "Terminwunsch Lenas als Zurückweisung erlebt wird und in Tränen oder Rückzug endet. "
        "Selbstüberhöhung beschreibt Lena kaum; eher erscheint Marco auf ihre Bestätigung "
        "angewiesen. Ob das Selbstbild schwankt, lässt sich aus dieser Außensicht nicht "
        "belastbar sagen.",
        belege=(
            (6, "Irgendwann hat er geweint."),
            (15, "Er hat angefangen zu weinen, richtig, wie ein Kind."),
        ),
    ),
    "pers_empathie": Antwort(
        "gut",
        "Das Bild ist ausdrücklich zweiseitig. In akuten Notlagen zeigt Marco eine praktische, "
        "verlässliche Fürsorge, die Lena selbst hervorhebt, und in der ruhigen Phase 2025 ein "
        "anhaltendes Interesse an ihrem Alltag. In Alltagskonflikten fehlt Perspektivübernahme "
        "dagegen weitgehend: Lenas Verletzung wird als Überempfindlichkeit abgetan, ihre Scham "
        "vor Dritten als Spielverderberei. Empathie wird dort erkennbar, wo Lena Hilfe braucht, "
        "und bleibt dort aus, wo sie etwas für sich beansprucht.",
        belege=(
            (10, "Du bist echt zu empfindlich."),
            (12, "Jetzt tu nicht so, als wäre das schlimm gewesen."),
            (18, "Musst du immer so ein Drama machen?"),
        ),
        gegenbelege=(
            (9, "In der Klinik hat er mit der Ärztin gesprochen, als ich nichts mehr verstanden habe, und mir hinterher alles in Ruhe erklärt."),
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "pers_dagegen": Antwort(
        "gut",
        "Gegen eine überdauernde Problematik spricht einiges, das eine Fachperson kennen "
        "sollte. Marco zeigt in Krisen verlässliche Fürsorge und über mehrere Monate stabile "
        "Zuwendung, als die Beziehung auf dem Spiel stand — Hinweise auf erhaltene "
        "Beziehungsfähigkeit und auf Veränderbarkeit. Nach der Trennung kündigt er an, sich "
        "therapeutische Hilfe zu suchen. Zudem stammt das gesamte Material von Lena, verfasst "
        "überwiegend in belasteten Phasen; dass sie entlastende Szenen ausdrücklich festhält, "
        "spricht für ihre Sorgfalt, ändert aber nichts an der Einseitigkeit. Dagegen steht, "
        "dass die Veränderung nach sieben Monaten beim nächsten eigenständigen Schritt Lenas "
        "endete. Offen bleibt, ob Marcos Veränderungen Einsicht oder Verlustangst ausdrückten "
        "— das kann das Material nicht entscheiden.",
        belege=(
            (9, "Ich schreibe das auf, weil es auch stimmt."),
            (16, "Seit dem Abend im Februar ist Marco wie ausgewechselt."),
            (21, "er habe einen Termin bei einem Therapeuten"),
        ),
        gegenbelege=(
            (17, "Na, wie war's mit deinen wichtigen Leuten?"),
        ),
    ),

    # ── Bindung & Regulation ─────────────────────────────────────────────────
    "bind_muster": Antwort(
        "gut",
        "Bei Lena klingen ängstliche Bindungsanteile an. Schweigen der Bezugsperson löst "
        "Verzweiflung aus und die Bereitschaft, fast alles zu tun, damit es aufhört; Zuwendung "
        "wird nicht entspannt angenommen, sondern misstrauisch überwacht. Gleichzeitig zeigt "
        "sie die Fähigkeit, andere Bindungen zu nutzen und zu reparieren — zur Schwester und "
        "zur besten Freundin. Ob diese Anteile schon vor der Beziehung bestanden oder sich in "
        "ihr entwickelt haben, lässt das Material offen.",
        belege=(
            (7, "Ich würde fast alles tun, damit es aufhört."),
            (16, "Wenn er nach Hause kommt, atme ich erst aus, wenn ich seine Stimme gehört habe."),
            (13, "Mir fällt auf, dass ich am Geräusch des Schlüssels in der Tür höre, wie Marcos Laune ist."),
        ),
        gegenbelege=(
            (24, "Ich habe ihr gesagt, dass es mir leidtut, das mit meinem Geburtstag, dass ich gar nicht krank war."),
        ),
    ),
    "bind_naehe": Antwort(
        "gut",
        "Nähe entsteht in dieser Beziehung schnell und intensiv und wird von Marco gestaltet — "
        "Nachrichten ab dem ersten Morgen, Zukunftspläne nach wenigen Wochen. Lena erlebt das "
        "schon zu Beginn als überwältigend. Distanz entsteht vor allem als Schweigen nach "
        "Konflikten und ist für Lena kaum aushaltbar. Eigene Nähe außerhalb der Beziehung, zur "
        "Freundin und zu Kollegen, schränkt Lena zunehmend ein, um Konflikten auszuweichen.",
        belege=(
            (1, "Es ist nur alles so schnell"),
            (1, "Und ein bisschen außer Atem"),
            (7, "Ich schlafe kaum."),
            (4, "Marco habe ich gesagt, ich sei länger im Büro."),
            (11, "Seitdem schreibe ich Jonas nur noch das Nötigste."),
        ),
    ),
    "bind_regulation": Antwort(
        "gut",
        "In Belastung reguliert sich Lena zunächst über Anpassung und Selbstbefragung: sich "
        "entschuldigen, erklären, nachts grübeln, Belege suchen. Diese Strategien verschärfen "
        "die Unsicherheit eher. Hilfreich sind im Material das Gespräch mit der Schwester, "
        "Zeit mit der besten Freundin und das bewusste Verkürzen eigener Antworten. Nach der "
        "Trennung ist eine Entwicklung erkennbar: Sie lässt Erklärungen ungesendet und holt "
        "sich vor dem Antworten Unterstützung.",
        belege=(
            (2, "Ich habe die halbe Nacht jedes Gespräch im Kopf nachgespielt"),
            (3, "Nachts im Gästezimmer habe ich angefangen, im Handy zurückzuscrollen"),
            (22, "Abgeschickt habe ich keine."),
            (25, "Am zweiten Abend habe ich Katrin angerufen."),
            (23, "Die dritte hatte nur noch den Terminvorschlag."),
        ),
    ),
    "bind_trennung": Antwort(
        "gut",
        "Trennungsdrohung und Trennung sind dicht belegt. Auf Lenas ruhig ausgesprochene "
        "Drohung reagiert Marco mit Zusammenbruch, Flehen und dem Versprechen, sich zu ändern. "
        "Bei der tatsächlichen Trennung zeigt er innerhalb einer Stunde Flehen, Vorwurf und "
        "Kälte, stellt sich kurz vor die Tür und schreibt bis Mitternacht dreiundzwanzig "
        "Nachrichten, zuletzt eine Drohung. Drei Wochen später folgt nachts eine Aufwertung, "
        "am Morgen eine Forderung. Lena reagiert mit Angst und Erleichterung zugleich und mit "
        "einer deutlichen körperlichen Stressreaktion.",
        belege=(
            (15, "Er hat angefangen zu weinen, richtig, wie ein Kind."),
            (20, "In der nächsten Stunde war er drei verschiedene Menschen."),
            (20, "Du wirst das bereuen."),
            (21, "Die 1.200 Euro für die Küche überweist du bitte bis Freitag."),
            (20, "Auf der Treppe musste ich mich am Geländer festhalten."),
        ),
    ),
}

_LENA_EIGENANTEIL_BIS_KONTEXT = {
    # ── Eigenanteil & Veränderung ────────────────────────────────────────────
    "eig_sicht": Antwort(
        "gut",
        "Lena benennt eigene Anteile ungewöhnlich offen. Sie beschreibt, dass sie sich "
        "vorschnell entschuldigt, Treffen verschwiegen und Marco gegenüber Dritten gedeckt hat. "
        "Am deutlichsten wird sie bei der Trennungsdrohung: Sie erkennt, dass sie den Satz "
        "mehrfach als Hebel eingesetzt hat, und nennt das nicht fair. Die Außensicht der "
        "Schwester nimmt sie als Hinweis auf ein eigenes Muster auf, nicht nur als Kritik an "
        "Marco.",
        belege=(
            (15, "Das war nicht fair, auch wenn ich es ernst meinte."),
            (15, "Ich merke, dass ich ihn benutze."),
            (4, "Marco habe ich gesagt, ich sei länger im Büro."),
            (6, "Den Freundinnen habe ich nicht geschrieben, dass es nicht stimmt."),
            (19, "Scham, weil ich so viel verschwiegen habe."),
        ),
    ),
    "eig_luecke": Antwort(
        "duenn",
        "Vorsichtig beobachtet: Lena erwähnt, dass sie Schwester und Freundinnen gegenüber "
        "Marcos Verhalten verdeckt hat, ordnet aber kaum ein, was dieses Schützen über Monate "
        "für diese Beziehungen bedeutet hat. Wenig Raum bekommt außerdem, wie Marcos "
        "Verlustangst und ihre Trennungsankündigungen ineinandergreifen — sein Zusammenbruch "
        "wird geschildert, aber nicht gedeutet. Beides sind Beobachtungen am Material, keine "
        "Versäumnisse.",
        belege=(
            (6, "Katrin hat angerufen und gefragt, ob sie mir Suppe vorbeibringen soll. Ich habe gesagt, es gehe schon."),
            (18, "Ich habe gesagt, mein Freund sucht nur einen Parkplatz."),
        ),
    ),
    "eig_ambivalenz": Antwort(
        "gut",
        "Die Ambivalenz ist deutlich und durchgängig belegt. Lena beschreibt Erleichterung und "
        "Zweifel im selben Moment, erlebt gute Phasen als Hoffnung und als Bedrohung zugleich "
        "und zweifelt nach guten Erfahrungen an ihrer Einschätzung des Übrigen. Auch nach der "
        "Trennung bleibt sie für Marcos nächtliche Nachricht ansprechbar. Die Richtung hat "
        "sich dennoch verschoben: Die jüngsten Szenen zeigen Ambivalenz im Gefühl, aber nicht "
        "mehr im Handeln.",
        belege=(
            (8, "Erleichterung, so groß, dass sie wehtat. Und ganz leise: schon wieder."),
            (9, "Vielleicht übertreibe ich das andere doch."),
            (16, "Hoffnung und Misstrauen gleichzeitig."),
            (21, "Ich habe bis zwei Uhr Antworten geschrieben und wieder gelöscht."),
            (25, "Ob ich das Problem war."),
        ),
    ),
    "eig_haltekraefte": Antwort(
        "gut",
        "Gehalten haben Lena vor allem drei Dinge: die guten Zeiten, insbesondere Marcos "
        "Fürsorge in der Krise, die sie an ihrer eigenen Wahrnehmung zweifeln ließ; die "
        "Hoffnung auf Veränderung, genährt durch die ruhigen Monate 2025; und Scham, die sie "
        "davon abhielt, sich früher jemandem anzuvertrauen. Finanziell war sie nicht abhängig — "
        "sie verdiente mehr als Marco. Offen bleibt, welche Rolle die Wohnung, in die sie zu "
        "ihm gezogen war, und der gemeinsame Freundeskreis gespielt haben.",
        belege=(
            (9, "In diesen drei Tagen war er genau der Mensch, in den ich mich verliebt habe."),
            (16, "Ich müsste glücklich sein."),
            (19, "Scham, weil ich so viel verschwiegen habe."),
            (5, "Ich verdiene mehr als er und muss mich trotzdem erklären."),
        ),
    ),

    # ── Belastung & Ressourcen ───────────────────────────────────────────────
    "res_belastung": Antwort(
        "gut",
        "Die Belastung ist hoch: im Fragebogen 8 von 10, in den Szenen der Beziehungszeit "
        "überwiegend 4 und 5. Sie zeigt sich körperlich und kognitiv — Schlafprobleme bis zu "
        "einer erwogenen Krankschreibung, Konzentrationsschwierigkeiten bei der Arbeit, "
        "nächtliches Grübeln. Auffällig ist eine anhaltende Wachsamkeit gegenüber Marcos "
        "Stimmung, die Lena selbst erschreckend normal vorkommt. Nach der Trennung genügt eine "
        "einzelne Nachricht, um Schlaf und Konzentration zwei Tage lang zu beeinträchtigen.",
        belege=(
            (12, "Es war der Tag, an dem mich meine Hausärztin wegen der Schlafprobleme krankschreiben wollte."),
            (7, "Ich schlafe kaum."),
            (13, "Erschrocken, wie normal mir das vorkam."),
            (25, "Ich habe schlecht geschlafen, bei der Arbeit dreimal denselben Absatz gelesen"),
        ),
    ),
    "res_ausnahmen": Antwort(
        "gut",
        "Es gelingt dort, wo Lena Unterstützung von außen hat und nicht auf Marcos Reaktion "
        "wartet. Ein Tag mit der besten Freundin verläuft unbeschwert, und Lena kann dort sogar "
        "eine alte Unwahrheit ansprechen. Mit Hilfe der Schwester gelingen ihr kurze, sachliche "
        "Antworten an Marco, die sie als eigene erlebt. Für ein Erstgespräch liegt der "
        "Ansatzpunkt eher in diesen Ausnahmen nach der Trennung als in den guten Phasen der "
        "Beziehung: Sie zeigen, was Lena selbst tun kann.",
        belege=(
            (24, "Abends ist mir aufgefallen, dass ich den ganzen Tag nicht aufs Handy geschaut habe."),
            (24, "Das weiß ich doch längst."),
            (25, "Ich hole sie Samstag um elf. Leg sie bitte in den Flur."),
            (23, "Aber die dritte Mail war meine."),
        ),
    ),
    "res_staerken": Antwort(
        "gut",
        "Belegt ist eine hohe Reflexionsfähigkeit: Lena hält auch Szenen fest, die ihrer "
        "eigenen Deutung widersprechen, und benennt eigenes Verhalten ohne Beschönigung. Dazu "
        "kommen Klarheit und Planungsfähigkeit unter Druck — die Trennung ist vorbereitet, "
        "ruhig ausgesprochen und gegen erheblichen Widerstand durchgehalten. Beruflich ist sie "
        "leistungsfähig und wird während der Beziehung befördert. Und sie kann Beziehungen "
        "reparieren, wie das Gespräch mit der besten Freundin zeigt.",
        belege=(
            (9, "Ich schreibe das auf, weil es auch stimmt."),
            (15, "Ich muss ehrlich sein: Für einen Moment habe ich mich stark gefühlt."),
            (20, "Ich wollte es ruhig sagen, am Tisch, bei Tageslicht, nicht im Streit"),
            (17, "meine erste Dienstreise als Abteilungsleiterin"),
            (24, "Ich habe ihr gesagt, dass es mir leidtut, das mit meinem Geburtstag, dass ich gar nicht krank war."),
        ),
    ),
    "res_umfeld": Antwort(
        "gut",
        "Die Schwester ist die tragende Unterstützung: Sie hört zu, bietet Wohnraum an, "
        "begleitet die Trennung und liest Nachrichten gegen. Die beste Freundin ist nach einer "
        "Phase der Distanz wieder nah. Gleichzeitig ist das Umfeld beschädigt: Zwei Paare aus "
        "dem gemeinsamen Freundeskreis haben sich nach Marcos Darstellung zurückgezogen, eine "
        "Bekannte will sich heraushalten. Professionelle Begleitung vor der jetzigen gibt es "
        "nicht; eine Hausärztin ist wegen der Schlafprobleme eingebunden.",
        belege=(
            (19, "Sie hat gesagt, ich kann jederzeit bei ihr wohnen."),
            (20, "Im Auto hat Katrin nichts gefragt, nur meine Hand gehalten."),
            (24, "Mit Mira auf dem Flohmarkt am Kanal"),
            (22, "Zwei Paare aus dem gemeinsamen Freundeskreis melden sich seitdem nicht mehr."),
        ),
    ),
    "res_halt": Antwort(
        "duenn",
        "Halt beschreibt Lena in den Szenen vor allem in Menschen, kaum in Tätigkeiten oder "
        "Orten. Neben Schwester und bester Freundin erscheint die Arbeit als Bereich, in dem "
        "sie Anerkennung und Stolz erlebt. Im Selbstprofil nennt sie zusätzlich Schreiben und "
        "Spaziergänge; in den Szenen kommen sie nicht vor. Eigene Routinen, die sie gezielt "
        "stabilisieren, wären im Gespräch zu erkunden.",
        belege=(
            (17, "Ich war so stolz."),
            (24, "Leicht. So kann es sich also anfühlen."),
        ),
    ),

    # ── Sicherheit & Grenzen ─────────────────────────────────────────────────
    "sich_grenzen": Antwort(
        "gut",
        "Grenzverletzungen sind mehrfach und in verschiedenen Bereichen belegt. Digital: Lenas "
        "Chat wird ohne ihr Wissen gelesen, der Code eingefordert. Finanziell: Ausgaben müssen "
        "belegt werden, während eigene größere Anschaffungen nicht besprochen werden; nach der "
        "Trennung wird die Unterschrift für die Kontoauflösung an ein Eingeständnis geknüpft. "
        "Sozial: Absage ihrer Feier unter falschem Vorwand, Spott vor Dritten. Räumlich: Beim "
        "Auszug stellt Marco sich etwa eine Minute vor die Tür, ohne sie zu berühren. Sexuelle "
        "Grenzverletzungen werden nicht geschildert.",
        belege=(
            (11, "Er hatte meinen Chat mit Jonas gelesen"),
            (5, "Dann wollte er den Kassenbon sehen."),
            (6, "Lena hat sich was eingefangen, wir müssen heute leider absagen."),
            (12, "Er hat meine Stimme nachgemacht, hoch und weinerlich"),
            (20, "Vielleicht eine Minute, er hat mich nicht angefasst."),
            (23, "Ich unterschreibe, wenn du endlich zugibst, dass du drei Jahre von meinem Geld gelebt hast."),
        ),
    ),
    "sich_gewalt": Antwort(
        "gut",
        "Körperliche Gewalt wird nicht geschildert. Kontrolle ist dagegen deutlich belegt: "
        "über Kommunikation, über Geld und über Kontakte. Nach der Trennung finden sich eine "
        "ausgesprochene Drohung, ein kurzes Versperren des Weges und eine Rufschädigung im "
        "gemeinsamen Umfeld. Einschüchterung zeigt sich weniger in einzelnen Handlungen als in "
        "Lenas vorausschauender Anpassung an Marcos Stimmung.",
        belege=(
            (20, "Du wirst das bereuen."),
            (20, "Als ich meine Jacke genommen habe, hat er sich vor die Wohnungstür gestellt."),
            (11, "Am Ende habe ich ihm meinen Code gegeben."),
            (23, "Marco hat seit sechs Wochen jeden Termin verschoben"),
            (22, "dass ich ihn mit einem Kollegen betrogen hätte"),
            (13, "Danach entscheide ich, was ich koche."),
        ),
    ),
    "sich_selbst": Antwort(
        "keine",
        "Im freigegebenen Material finden sich keine Äußerungen zu Lebensmüdigkeit oder "
        "Selbstverletzung. Beschrieben sind Schlafprobleme und Phasen starker Verzweiflung; sie "
        "sind kein Hinweis auf Selbstgefährdung, lassen sich im Erstgespräch aber direkt "
        "ansprechen.",
    ),
    "sich_erstgespraech": Antwort(
        "gut",
        "Aus dem Material ergeben sich fünf Punkte. Erstens: der aktuelle Kontakt zu Marco, "
        "vor allem die offene Kontoauflösung als wiederkehrender Anlass. Zweitens: die Drohung "
        "nach der Trennung und das Versperren der Tür — wie Lena beides heute einschätzt und ob "
        "es seither Vorfälle gab. Drittens: Schlaf und Belastung. Viertens: die Folgen der "
        "Rufschädigung im gemeinsamen Umfeld. Fünftens: ein Plan für Kontakte zu Marco, der an "
        "die zuletzt gelungenen kurzen Antworten anknüpft.",
        belege=(
            (23, "Das gemeinsame Konto ist immer noch nicht aufgelöst."),
            (20, "Die Minute an der Tür träume ich seitdem öfter."),
            (12, "Es war der Tag, an dem mich meine Hausärztin wegen der Schlafprobleme krankschreiben wollte."),
            (22, "Zwei Paare aus dem gemeinsamen Freundeskreis melden sich seitdem nicht mehr."),
            (25, "Ein Satz, ohne Erklärung."),
        ),
    ),

    # ── Kontext & System ─────────────────────────────────────────────────────
    "kon_beteiligte": Antwort(
        "gut",
        "Wichtigste weitere Person ist die Schwester, Vertraute und Stütze bei der Trennung. "
        "Die beste Freundin hat Lena und Marco einander vorgestellt, wird von Marco als "
        "schlechter Einfluss behandelt und ist nach der Trennung wieder nah. Ein Kollege wird "
        "zum Anlass für Marcos Misstrauen und später für die Betrugsgeschichte. Lenas Eltern "
        "treten beim Herzinfarkt des Vaters auf; die Mutter schätzt Marco dort ausdrücklich. "
        "Aus Marcos Umfeld kommen seine Mutter und ein Freund vor, bei dem er Heiligabend "
        "verbringt und über dessen Partnerin Lena von der Rufschädigung erfährt.",
        belege=(
            (19, "Katrin hat nichts gesagt, bis ich fertig war."),
            (1, "Kennengelernt haben wir uns Ende August auf Miras Geburtstag"),
            (11, "meinem Kollegen aus dem Leipzig-Projekt"),
            (9, "Den behältst du."),
            (22, "Über Tobis Frau habe ich erfahren, was Marco erzählt"),
        ),
    ),
    "kon_kinder": Antwort(
        "keine",
        "Kinder kommen in den Szenen nicht vor. Im Selbstprofil gibt Lena an, keine Kinder zu "
        "haben.",
    ),
    "kon_lebenslage": Antwort(
        "gut",
        "Lena ist beruflich stabil, verdient mehr als Marco und wird während der Beziehung "
        "Abteilungsleiterin; finanzieller Druck besteht für sie nicht, wohl aber Kontrolle über "
        "gemeinsames Geld. Zwei Jahre lebte sie in Marcos Wohnung und zog bei der Trennung "
        "zunächst zur Schwester; im Selbstprofil ist sie inzwischen allein lebend angegeben. "
        "Das nicht aufgelöste gemeinsame Konto ist der wichtigste äußere Umstand, der Kontakt "
        "erzwingt.",
        belege=(
            (5, "ich zahle mehr ein, weil ich mehr verdiene"),
            (17, "meine erste Dienstreise als Abteilungsleiterin"),
            (20, "Ich ziehe heute zu Katrin."),
            (23, "Die Bank braucht beide Unterschriften"),
        ),
    ),
    "kon_vorbehandlung": Antwort(
        "duenn",
        "Eine frühere Psychotherapie oder Beratung ist im Material nicht beschrieben. Lena hat "
        "während der Beziehung eine Paarberatung vorgeschlagen, zu der es nicht kam. Eine "
        "Hausärztin war wegen Schlafproblemen eingebunden und wollte krankschreiben; ob es dazu "
        "kam, bleibt offen. Medikation wird nicht erwähnt.",
        belege=(
            (14, "Nach dem Abendessen habe ich ihm den Flyer einer Paarberatungsstelle hingelegt"),
            (12, "Es war der Tag, an dem mich meine Hausärztin wegen der Schlafprobleme krankschreiben wollte."),
        ),
    ),
}

#: Marco, wie er in Lenas Szenen erscheint. Selbstbild und Dramatisierung bleiben bewusst
#: unter zwei Belegen — daran sieht man „zu dünn belegt" und einen nicht beurteilbaren Anteil.
_LENA_ACHSEN = {
    "impulsivitaet": Auspraegung(
        52,
        "Mehrfach folgt auf eine Kränkung eine schnelle, folgenreiche Handlung: die Absage der "
        "Feier wenige Stunden nach Lenas Terminwunsch, das Lesen des Handys, dreiundzwanzig "
        "Nachrichten an einem Abend. Daneben stehen lange Phasen des Schweigens, die eher "
        "gehalten als impulsiv wirken.",
        belege=(
            (6, "In der Gruppe, in die ich Marco zum Planen aufgenommen hatte, stand von ihm, 13:12 Uhr"),
            (11, "Als ich aus der Dusche kam, saß Marco auf dem Bett, mein Handy in der Hand."),
            (20, "Bis Mitternacht kamen dreiundzwanzig Nachrichten."),
        ),
        gegenbelege=(
            (7, "Er sagt dem Kater Guten Morgen, mir nicht."),
        ),
    ),
    "affekt": Auspraegung(
        72,
        "Innerhalb kurzer Zeit wechseln Tränen, Vorwurf und Kälte, am deutlichsten bei der "
        "Trennung. Auch der Geburtstag verläuft am selben Tag von Kränkung über Weinen zu "
        "Zärtlichkeit, und nach der Trennung liegen zwischen Liebeserklärung und Forderung "
        "wenige Stunden.",
        belege=(
            (20, "In der nächsten Stunde war er drei verschiedene Menschen."),
            (6, "Irgendwann hat er geweint."),
            (6, "Im Hotel war er zärtlich, hat Champagner bestellt"),
            (21, "Um 7:02 Uhr kam die nächste Nachricht"),
        ),
        gegenbelege=(
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "grandiositaet": Auspraegung(
        48,
        "Anspruchshaltung zeigt sich vor allem darin, dass eigene Pläne und Ausgaben keiner "
        "Absprache bedürfen, Lenas aber schon. Herabsetzung richtet sich gegen Lena, ihre "
        "Freundin und ihren beruflichen Erfolg. Ausgeprägte Selbstüberhöhung beschreibt Lena "
        "nicht.",
        belege=(
            (5, "Darüber haben wir nicht gesprochen. Ich habe es an der Abbuchung gesehen."),
            (15, "mit deiner Seelsorgerin setze ich mich nicht an einen Tisch"),
            (17, "Na, wie war's mit deinen wichtigen Leuten?"),
        ),
        gegenbelege=(
            (15, "Er hat sich in der Küche auf den Boden gesetzt und gesagt, dass er alles ändert"),
        ),
    ),
    "empathie": Auspraegung(
        38,
        "Perspektivübernahme ist in Krisen und in der ruhigen Phase 2025 klar erkennbar, in "
        "Alltagskonflikten kaum. Lenas Verletzungen werden dort wiederholt als Empfindlichkeit "
        "oder Drama abgetan.",
        belege=(
            (10, "Du bist echt zu empfindlich."),
            (12, "Jetzt tu nicht so, als wäre das schlimm gewesen."),
            (18, "Musst du immer so ein Drama machen?"),
        ),
        gegenbelege=(
            (9, "In der Klinik hat er mit der Ärztin gesprochen, als ich nichts mehr verstanden habe, und mir hinterher alles in Ruhe erklärt."),
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "verlassenheit": Auspraegung(
        74,
        "Auf angekündigte oder tatsächliche Trennung reagiert Marco sehr deutlich: "
        "Zusammenbruch, Flehen, Versprechen, nach der Trennung nächtliche Nachrichten. Schon "
        "früh verknüpft er Lenas Nähe mit der Frage, ob er ohne sie leben kann.",
        belege=(
            (15, "Er hat angefangen zu weinen, richtig, wie ein Kind."),
            (20, "Erst hat er geweint und gefleht"),
            (21, "er bitte nur um ein Gespräch"),
            (8, "er könne ohne mich nicht leben"),
        ),
    ),
    "idealisierung": Auspraegung(
        78,
        "Aufwertung und Abwertung derselben Person wechseln über die ganze Beziehung, oft im "
        "Abstand von Tagen, nach der Trennung innerhalb von Stunden. Die Monate 2025 zeigen "
        "eine gleichmäßigere Zuwendung.",
        belege=(
            (1, "wir seien Seelenverwandte"),
            (2, "Das war peinlich naiv, wie du das erzählt hast."),
            (8, "ich sei das Beste, was ihm je passiert ist"),
            (20, "Du hast doch niemanden mehr."),
            (21, "Ich sei die Liebe seines Lebens"),
        ),
        gegenbelege=(
            (16, "Er fragt jeden Abend, wie mein Tag war, und hört sich die Antwort an."),
        ),
    ),
    "dramatisierung": Auspraegung(
        30,
        "Zuspitzung, um Aufmerksamkeit herzustellen, ist kaum beschrieben. Tränen und große "
        "Gesten stehen eher im Zusammenhang mit drohendem Verlust als mit Außenwirkung; vor "
        "Dritten zeigt sich Spott, nicht Inszenierung. Für eine Zahl reicht das nicht.",
        belege=(
            (8, "stand er mit einem riesigen Strauß Ranunkeln in der Küche"),
        ),
    ),
    "grenzen": Auspraegung(
        76,
        "Grenzen werden wiederholt und in mehreren Bereichen übergangen: digital, finanziell, "
        "sozial und beim Auszug räumlich. Körperliche Übergriffe werden nicht geschildert.",
        belege=(
            (11, "Er hatte meinen Chat mit Jonas gelesen"),
            (5, "Dann wollte er den Kassenbon sehen."),
            (6, "Lena hat sich was eingefangen, wir müssen heute leider absagen."),
            (12, "Er hat meine Stimme nachgemacht, hoch und weinerlich"),
            (20, "hat er sich vor die Wohnungstür gestellt"),
        ),
        gegenbelege=(
            (20, "er hat mich nicht angefasst"),
        ),
    ),
    "reue": Auspraegung(
        22,
        "Auf Verletzungen folgen Gesten, aber kaum Wiedergutmachung, die sich auf den Anlass "
        "bezieht; Versuche, ihn anzusprechen, werden abgewehrt. Die Ausnahme ist die "
        "anhaltende Veränderung nach Lenas Trennungsdrohung.",
        belege=(
            (8, "Lass uns das Wochenende nicht kaputtmachen."),
            (18, "Über die Nacht hat er kein Wort verloren."),
            (3, "Dann habe ich mich missverständlich ausgedrückt."),
        ),
        gegenbelege=(
            (8, "er sei ein Idiot"),
            (16, "Seit dem Abend im Februar ist Marco wie ausgewechselt."),
        ),
    ),
    "selbstbild": Auspraegung(
        40,
        "Marcos Selbstbild wird in Lenas Szenen kaum direkt sichtbar. Tränen bei Zurückweisung "
        "deuten auf Verletzlichkeit, erlauben aber keine Aussage darüber, wie beständig es ist.",
        belege=(
            (6, "Irgendwann hat er geweint."),
        ),
    ),
    "verantwortung": Auspraegung(
        18,
        "Eigener Anteil wird fast durchgängig verschoben, am deutlichsten beim Vorschlag einer "
        "Paarberatung. Die seltenen Eingeständnisse bleiben allgemein oder fallen in Momente "
        "drohenden Verlusts.",
        belege=(
            (14, "Mit dir und deinen Problemen müsste man da hin, nicht mit mir."),
            (3, "Du denkst dir Sachen aus, Lena."),
            (6, "du bist einfach nur undankbar"),
            (20, "Nach allem, was ich für dich getan habe."),
        ),
        gegenbelege=(
            (8, "er sei ein Idiot"),
            (21, "er verstehe jetzt, was er mir angetan habe"),
        ),
    ),
    "einfluss": Auspraegung(
        70,
        "Lenas Verhalten wird wiederholt über Schweigen, Schuldzuweisung und Bedingungen "
        "gesteuert, nach der Trennung auch über das gemeinsame Konto.",
        belege=(
            (7, "Er sagt dem Kater Guten Morgen, mir nicht."),
            (6, "du bist einfach nur undankbar"),
            (11, "Wer nichts zu verbergen hat, hat damit auch kein Problem."),
            (23, "Ich unterschreibe, wenn du endlich zugibst"),
            (20, "Du wirst das bereuen."),
        ),
    ),
}

LENA = FallFaq(
    antworten={
        **_LENA_AUFTRAG_BIS_VERLAUF, **_LENA_PERSON_UND_BINDUNG, **_LENA_EIGENANTEIL_BIS_KONTEXT,
    },
    achsen=_LENA_ACHSEN,
    materiallage={
        "umfang": (
            "25 Szenen von September 2023 bis Juli 2026, dazu Fragebogen, Selbstprofil und "
            "eine Einschätzung Marcos. Die Beziehung ist durchgehend dokumentiert, die Zeit "
            "nach der Trennung in sechs Szenen."
        ),
        "luecken": (
            "Zwischen Februar und Dezember 2025 liegen nur zwei Szenen, und Marcos Selbstbild "
            "wird kaum sichtbar. Für Selbstbildstabilität und Dramatisierung reicht das "
            "Material deshalb nicht für eine Zahl."
        ),
        "einseitigkeit": (
            "Alle Szenen stammen von Lena, viele aus belasteten Phasen. Die Werte beschreiben, "
            "wie dicht Muster in ihrer Schilderung belegt sind, nicht Marco als Person. Dass sie "
            "auch entlastende Szenen festhält, mildert die Einseitigkeit, hebt sie aber nicht auf."
        ),
    },
)

# ═════════════════════════════════════════════════════════════════════════════
# Marco — nutzende Person Marco, Fallperson Lena
# ═════════════════════════════════════════════════════════════════════════════

_MARCO_AUFTRAG_BIS_VERLAUF = {
    # ── Auftrag & Anliegen ───────────────────────────────────────────────────
    "anliegen_kern": Antwort(
        "gut",
        "Marco will verstehen, warum aus großer Nähe ständige Kritik wurde und warum er am "
        "Ende als der Schuldige dasteht. Im Vordergrund steht das Gefühl, trotz großer Mühe "
        "falsch gesehen zu werden, verbunden mit der Kränkung, dass Lena ihre Trennung mit "
        "anderen vorbereitet hat. In den jüngsten Szenen verschiebt sich das Anliegen: Aus der "
        "Frage, was Lena falsch gemacht hat, wird die Frage, was er selbst gesucht hat.",
        belege=(
            (5, "Enttäuscht, dass meine Mühe nichts gezählt hat."),
            (14, "Ich erkenne mich darin nicht."),
            (15, "Hingegangen bin ich, um zu verstehen, was Lena falsch gemacht hat."),
            (15, "Herausgekommen ist: dass sie geht."),
        ),
    ),
    "anliegen_ziel": Antwort(
        "gut",
        "Ausdrücklich will Marco verstanden werden und nicht allein als der Schuldige gelten. "
        "Die jüngste Szene fügt ein Ziel hinzu, das er selbst ausspricht: ein Muster erkennen, "
        "damit sich die nächste Beziehung nicht auf dieselbe Weise auflöst. Beide Ziele stehen "
        "nebeneinander, und Marco benennt die Spannung zwischen ihnen selbst.",
        belege=(
            (14, "Ohnmächtig gegen eine Geschichte, die mich zum Täter macht."),
            (15, "Ich will nicht, dass jetzt alles meine Schuld ist."),
            (15, "Aber ich will auch nicht, dass die Nächste irgendwann ihre Tasche packt und ich wieder nicht verstehe, warum."),
        ),
    ),
    "anliegen_versucht": Antwort(
        "gut",
        "Marcos Lösungsversuche zielen überwiegend darauf, Verlust abzuwenden: Rückzug, um "
        "nicht laut zu werden, Gesten statt Aussprache, nach Lenas Trennungsdrohung monatelange "
        "Anstrengung. Kontrolle beschreibt er selbst als Versuch, Ruhe zu finden, die sich "
        "nicht einstellte. Nach der Trennung erzählt er im Freundeskreis seine Version, was "
        "ihn nicht entlastet. Wirksam erscheint erst die Männerberatung, die er seit Juni "
        "besucht.",
        belege=(
            (6, "Lieber still."),
            (12, "Ich dachte, das sagt mehr als eine Entschuldigung."),
            (10, "Seitdem gebe ich mir Mühe wie nie."),
            (8, "Ich dachte, dann ist Ruhe in meinem Kopf. Es war keine Ruhe."),
            (15, "Seit Juni gehe ich alle zwei Wochen zu einer Männerberatung."),
        ),
    ),
    "anliegen_erwartung": Antwort(
        "duenn",
        "Erwartungen an eine Fachperson äußert Marco nicht direkt. Aus seiner Schilderung der "
        "Beratung lässt sich ablesen, dass er mit dem Wunsch kam, in seiner Sicht bestätigt zu "
        "werden, und dass eine gezielte Frage ihn stattdessen zu eigener Einsicht geführt hat. "
        "Die Befürchtung, dass am Ende alles ihm zugeschrieben wird, spricht er offen aus; sie "
        "dürfte eine neue Arbeitsbeziehung anfangs prägen.",
        belege=(
            (15, "Das habe ich dem Berater in der ersten Stunde auch so gesagt."),
            (15, "Ich will nicht, dass jetzt alles meine Schuld ist."),
        ),
    ),

    # ── Beziehungsdynamik ────────────────────────────────────────────────────
    "dyn_zyklus": Antwort(
        "gut",
        "Aus Marcos Sicht wiederholt sich: Er plant oder sucht Nähe, Lena setzt eigene "
        "Prioritäten, er fühlt sich zurückgesetzt und reagiert mit einer Spitze, einer "
        "eigenmächtigen Handlung oder Rückzug. Lena spricht es an, er schweigt, bis sie sich "
        "entschuldigt oder er mit einer Geste zurückkehrt. Über den Anlass wird nicht "
        "gesprochen, weil das für ihn hieße, einen Fehler zuzugeben. Die Episode um Lenas "
        "Geburtstag zeigt den Ablauf vollständig.",
        belege=(
            (5, "In dem Moment kam ich mir vor wie eine Option unter mehreren."),
            (5, "Ich habe in die Gruppe geschrieben, dass sie krank ist und wir absagen."),
            (6, "Ich habe tagelang kaum gesprochen."),
            (6, "Irgendwann hat sie sich entschuldigt, und dann ging es wieder."),
            (6, "Ich wusste nicht, wie ich zurückkommen soll, ohne zuzugeben, dass die Nachricht in der Gruppe falsch war."),
        ),
    ),
    "dyn_rollen": Antwort(
        "gut",
        "In Konflikten distanziert sich überwiegend Marco, Lena sucht die Klärung. Sobald Lena "
        "Trennung ankündigt oder geht, wird Marco zum Verfolger: Er fleht, verspricht und "
        "schreibt viele Nachrichten. Marco selbst erlebt die Rollen spiegelbildlich — als der, "
        "der Nähe sucht und zurückgewiesen wird. Beide Sichten sind im Material erkennbar und "
        "hängen davon ab, worum es gerade geht: um einen Konflikt oder um drohenden Verlust.",
        belege=(
            (6, "Da ging bei mir etwas zu."),
            (8, "Sie wollte nur darüber reden, dass ich ihr Handy genommen habe"),
            (10, "Ich habe geweint und sie angefleht, auf dem Küchenboden."),
            (13, "Ich habe gebettelt, ja."),
        ),
    ),
    "dyn_ende": Antwort(
        "gut",
        "Konflikte enden meist durch Marcos Rückzug, gefolgt von Lenas Entschuldigung oder "
        "einer Geste, die den Vorfall überdeckt. Eine Klärung beschreibt Marco nicht. Die "
        "Ausnahme ist Lenas Trennungsdrohung, nach der er sich über Monate verändert, ohne den "
        "Anlass zu besprechen.",
        belege=(
            (6, "Irgendwann hat sie sich entschuldigt, und dann ging es wieder."),
            (2, "Sie hat sich sofort entschuldigt und war den ganzen Abend beleidigt."),
            (12, "Am Morgen habe ich Frühstück gemacht, mit Kerzen."),
        ),
        gegenbelege=(
            (10, "Seitdem gebe ich mir Mühe wie nie."),
        ),
    ),
    "dyn_reparatur": Antwort(
        "gut",
        "Reparatur bleibt aus, und Marco beschreibt selbst, warum: Eine Entschuldigung hieße "
        "zuzugeben, dass er etwas falsch gemacht hat, und das erlebt er als Bestätigung, der "
        "Schuldige zu sein. An ihre Stelle treten Gesten. Rückblickend benennt er einzelne "
        "Fehler klar — allerdings erst in Szenen, die mit Abstand geschrieben sind.",
        belege=(
            (12, "Ich dachte, das sagt mehr als eine Entschuldigung."),
            (12, "Ich wollte nicht schon wieder der sein, der alles falsch gemacht hat."),
            (6, "ohne zuzugeben, dass die Nachricht in der Gruppe falsch war"),
            (5, "Das war falsch, das weiß ich heute."),
        ),
    ),
    "dyn_kipppunkt": Antwort(
        "gut",
        "Reproduzierbar kippt es, wenn Lena sich eigenständig bewegt — zu ihrer Freundin, zu "
        "ihren Leuten am Geburtstag, auf Dienstreise. Marco erlebt diese Momente als "
        "Zurücksetzung und als Vorzeichen, verlassen zu werden, und reagiert mit Abwertung der "
        "Freundin, einer eigenmächtigen Absage oder Rückzug. In Szene 11 formuliert er den "
        "Kipppunkt selbst: Lena sei glücklich ohne ihn.",
        belege=(
            (3, "Jedes Mal, wenn Lena von ihr kommt, ist sie anders."),
            (5, "In dem Moment kam ich mir vor wie eine Option unter mehreren."),
            (11, "Monatelang habe ich mich zusammengerissen, und sie fährt weg und ist glücklich ohne mich."),
            (15, "Ich habe nie etwas gefunden. Und ich habe trotzdem weitergesucht"),
        ),
    ),

    # ── Verlauf & Wendepunkte ────────────────────────────────────────────────
    "verl_entwicklung": Antwort(
        "gut",
        "Die Szenen reichen von September 2023 bis August 2026. Der Beginn ist für Marco eine "
        "Erfahrung von Sicherheit nach früher Verlusterfahrung. Ab Anfang 2024 dominieren "
        "Eifersucht auf die Freundin, Konflikte um Geld und um Lenas Geburtstag; die "
        "Krankenhaustage im Sommer sind der Höhepunkt der Nähe. Nach Lenas Trennungsdrohung im "
        "Februar 2025 strengt er sich monatelang an und bricht im September erschöpft ein. Auf "
        "die Trennung im Februar 2026 folgen Kränkung und eigene Darstellung im Freundeskreis, "
        "ab Juni eine Beratung, in der sich seine Deutung erkennbar verändert.",
        belege=(
            (1, "Glücklich. Zum ersten Mal seit Jahren nicht auf der Hut."),
            (3, "Und eifersüchtig auf eine Freundschaft, was ich mir nicht gern eingestehe."),
            (7, "Es klingt vielleicht komisch, aber das waren unsere besten Tage."),
            (11, "Ich hatte keine Kraft mehr, so zu tun, als wäre alles gut."),
            (15, "Zum ersten Mal traurig statt wütend."),
        ),
    ),
    "verl_wendepunkt": Antwort(
        "gut",
        "Für Marco ist Lenas ruhig ausgesprochene Trennungsdrohung der Wendepunkt: Danach lebt "
        "er in ständiger Verlustangst und passt sich an. Ein zweiter Wendepunkt zeichnet sich "
        "nach der Trennung ab — eine Frage in der Beratung, an der ihm klar wird, dass seine "
        "Kontrolle weniger der Untreue als dem Verlassenwerden galt. Den Unterschied sieht man "
        "daran, dass er in der letzten Szene erstmals die eigene Geschichte ins Zentrum stellt "
        "statt Lenas Fehler.",
        belege=(
            (10, "Es war, als wäre der Boden weg."),
            (10, "Diesmal habe ich ihr geglaubt."),
            (15, "Ich wollte sagen: dass sie mich betrügt. Herausgekommen ist: dass sie geht."),
        ),
    ),
    "verl_gut": Antwort(
        "gut",
        "Am besten war es für Marco in den Tagen im Krankenhaus bei Lenas Vater: Er wusste, "
        "was zu tun war, und Lena brauchte ihn. Auch den Abend im Hotel an Lenas Geburtstag "
        "erinnert er als gut, hält aber selbst fest, dass Lena ihn anders erlebt hat. Anders "
        "war in diesen Situationen, dass Lenas Aufmerksamkeit ungeteilt bei ihm lag.",
        belege=(
            (7, "In der Klinik wusste ich endlich einmal genau, was zu tun ist."),
            (7, "Sie hat mich gebraucht, und ich war gut in dem, was ich getan habe."),
            (5, "Im Hotel war es dann schön. Finde ich."),
        ),
        gegenbelege=(
            (5, "Sie sagt heute, sie sei den ganzen Abend nicht da gewesen."),
        ),
    ),
    "verl_richtung": Antwort(
        "gut",
        "Die Belastung steigt von 1 zu Beginn über 3 bis 4 im Jahr 2024 auf 5 bei Lenas "
        "Trennungsdrohung und bei der Trennung selbst. Danach liegen die Werte bei 3. Nach der "
        "Trennung ist die Richtung leicht fallend; qualitativ verschiebt sie sich von Wut zu "
        "Trauer.",
        belege=(
            (1, "Glücklich."),
            (10, "Panik."),
            (13, "Fassungslos und verlassen."),
            (15, "Zum ersten Mal traurig statt wütend."),
        ),
    ),
}

_MARCO_PERSON_UND_BINDUNG = {
    # ── Persönlichkeitsnahe Anhaltspunkte ────────────────────────────────────
    "pers_zuege": Antwort(
        "gut",
        "In Marcos Schilderung treten bei Lena wiederholt hervor: das Setzen eigener "
        "Prioritäten — Freundin, Geburtstagsfeier, Beruf —, das Ansprechen von Kritik und das "
        "rasche Entschuldigen nach Konflikten. Die ersten beiden deutet Marco als Zurückweisung "
        "und als Einfluss der Freundin. Gegen ein Bild von Kälte spricht, dass Lena in seiner "
        "eigenen Schilderung in der Krise Nähe bei ihm sucht. Die beschriebenen "
        "Verhaltensweisen sind überwiegend alltäglich; auffällig wird erst ihre Deutung.",
        belege=(
            (5, "heute sei doch der Italiener mit ihren Leuten"),
            (3, "sie stellt Fragen, die nicht von ihr sind"),
            (2, "Sie hat sich sofort entschuldigt"),
            (6, "Irgendwann hat sie sich entschuldigt"),
        ),
        gegenbelege=(
            (7, "Im Wartebereich ist Lena an meiner Schulter eingeschlafen"),
        ),
    ),
    "pers_idealisierung": Antwort(
        "duenn",
        "Ein Wechsel von Idealisierung und Entwertung ist bei Lena in Marcos Material nicht "
        "erkennbar; er beschreibt ihre Haltung eher als zunehmend kritisch, nicht als "
        "schwankend zwischen Bewunderung und Abwertung. Auffällig ist dagegen Marcos eigene "
        "Beschreibung: Lena erscheint ihm im selben Gespräch als der einzige Mensch, der ihn je "
        "gesehen hat, und als jemand, der wochenlang gegen ihn geplant hat.",
        belege=(
            (13, "Ich habe ihr gesagt, dass sie der einzige Mensch ist, der mich je wirklich gesehen hat."),
            (13, "Sie hatte das geplant, mit ihrer Familie, wochenlang, während sie neben mir geschlafen hat."),
        ),
    ),
    "pers_kritik": Antwort(
        "gut",
        "Marco schildert mehrere Situationen, in denen er Lena kritisiert oder ihr etwas "
        "verweigert. Lena reagiert darauf meist mit Entschuldigung, mit Verstimmung oder damit, "
        "sein Verhalten selbst zum Thema zu machen — etwa das Lesen ihres Handys statt seiner "
        "Unsicherheit. Auf seine Spitze nach der Dienstreise folgt ein Gesichtsausdruck, den er "
        "als Vorwurf liest. Aggressive oder vergeltende Reaktionen Lenas beschreibt er nicht.",
        belege=(
            (2, "Sie hat sich sofort entschuldigt und war den ganzen Abend beleidigt."),
            (8, "Sie wollte nur darüber reden, dass ich ihr Handy genommen habe"),
            (11, "Sie hat wieder dieses Gesicht gemacht."),
            (9, "Im Auto dann wieder Drama."),
        ),
    ),
    "pers_selbstbild": Antwort(
        "keine",
        "Zum Selbstbild der Fallperson enthält Marcos Material kaum Anhaltspunkte. Er "
        "beschreibt berufliche Entwicklung und Eigenständigkeit, aber nichts darüber, wie "
        "beständig Lena sich selbst erlebt. Eine Aussage dazu wäre nicht gedeckt.",
    ),
    "pers_empathie": Antwort(
        "duenn",
        "Belege in beide Richtungen sind in Marcos Szenen selten. Er vermisst, dass Lena seine "
        "Unsicherheit sieht, etwa nach dem Lesen ihres Handys. Gleichzeitig beschreibt er, dass "
        "Lena seine Kritik aufnimmt und sich entschuldigt. Ein einseitiges Bild wäre hier ein "
        "Auswahlfehler: Das Material zeigt vor allem, was Marco vermisst hat, nicht, was Lena "
        "empfand.",
        belege=(
            (8, "und nicht darüber, warum ich so unsicher war"),
        ),
        gegenbelege=(
            (2, "Sie hat sich sofort entschuldigt"),
        ),
    ),
    "pers_dagegen": Antwort(
        "gut",
        "Für eine überdauernde Problematik bei Lena gibt Marcos Material wenig her, und es "
        "enthält viel, was dagegen spricht. Lena ist beruflich erfolgreich, pflegt langjährige "
        "Freundschaften und familiäre Bindungen und entschuldigt sich nach Konflikten. Marco "
        "selbst nimmt mehrere seiner Deutungen zurück — die Nachricht an ihre Freundinnen, den "
        "Chat mit dem Kollegen, die Geschichte im Freundeskreis. Das spricht dafür, die "
        "Belastung eher in der Dynamik und in Marcos Verlustangst zu suchen als in "
        "überdauernden Zügen Lenas. Dagegen steht allenfalls, dass Lena die Trennung mehrfach "
        "angekündigt hat — ein wiederkehrendes Muster, das Marco als Druck erlebt.",
        belege=(
            (11, "Abteilungsleiterin."),
            (8, "Heute weiß ich, dass das nichts war, eine Arbeitssache."),
            (14, "Dass ich nie etwas gefunden habe, habe ich nicht dazugesagt."),
            (5, "Das war falsch, das weiß ich heute."),
        ),
        gegenbelege=(
            (10, "Sie hat den Satz vorher schon gesagt, im Sommer und im Herbst"),
        ),
    ),

    # ── Bindung & Regulation ─────────────────────────────────────────────────
    "bind_muster": Antwort(
        "gut",
        "Bei Marco klingt ein ängstlich-ambivalentes Muster an, das er selbst mit dem Weggang "
        "des Vaters verbindet. Drohender Verlust löst Panik und Klammern aus, Eigenständigkeit "
        "der Partnerin Kontrolle oder Rückzug. Eindrücklich ist die Parallele, die er zuletzt "
        "selbst zieht: der Junge, der abends nachsah, ob das Auto des Vaters noch vor der Tür "
        "stand, und der Mann, der im Flur nach der Tasche der Partnerin schaut. Die Einordnung "
        "bleibt tastend.",
        belege=(
            (1, "Seitdem war ich in jeder Beziehung der, der auf den Moment wartet, in dem die andere geht."),
            (10, "schaue ich als Erstes in den Flur, ob ihre Tasche noch da steht"),
            (15, "der Junge, der ich war und jeden Abend nachgesehen hat, ob sein Auto noch vor der Tür steht"),
            (10, "Es war, als wäre der Boden weg."),
        ),
    ),
    "bind_naehe": Antwort(
        "gut",
        "Nähe sucht Marco intensiv und früh, und er gestaltet sie so, dass er im Mittelpunkt "
        "steht — seine Nachricht soll das Erste sein, was Lena am Tag sieht. Am sichersten "
        "fühlt er sich, wenn Lena ihn braucht. Distanz der Partnerin, auch alltägliche, erlebt "
        "er als Zurückweisung. Eigene Distanz setzt er dagegen als Schutz ein, wenn Konflikte "
        "drohen, und beschreibt sie als Ruhebedürfnis.",
        belege=(
            (1, "Ich will, dass das Erste, was sie am Tag sieht, von mir ist."),
            (7, "Sie hat mich gebraucht, und ich war gut in dem, was ich getan habe."),
            (5, "In dem Moment kam ich mir vor wie eine Option unter mehreren."),
            (6, "Für mich waren es ein paar schlechte Tage, in denen ich Ruhe gebraucht habe."),
        ),
    ),
    "bind_regulation": Antwort(
        "gut",
        "Marco reguliert sich in Belastung vor allem über Rückzug und Verstummen, begründet mit "
        "der Angst, sonst wie sein Vater zu werden. Kontrolle — im Handy nachsehen, Ausgaben "
        "hinterfragen — dient ihm erkennbar der Beruhigung, verschafft aber keine. Handlung "
        "ersetzt Sprache: Frühstück statt Entschuldigung, Anstrengung statt Gespräch. Hilfreich "
        "wirkt zuletzt die Beratung, die ihm Worte für das Gefühl hinter der Kontrolle gibt.",
        belege=(
            (6, "Ich habe mir als Junge geschworen, dass ich nie so werde. Lieber still."),
            (8, "Ich dachte, dann ist Ruhe in meinem Kopf. Es war keine Ruhe."),
            (12, "Ich dachte, das sagt mehr als eine Entschuldigung."),
            (15, "Zum ersten Mal traurig statt wütend."),
        ),
    ),
    "bind_trennung": Antwort(
        "gut",
        "Trennungsdrohung und Trennung sind dicht belegt. Auf Lenas Drohung reagiert Marco mit "
        "Zusammenbruch, Flehen und monatelanger Anpassung unter ständiger Verlustangst. Bei der "
        "Trennung wechselt er zwischen Betteln und Vorwürfen, sagt nach eigener Aussage "
        "Verletzendes und schreibt viele Nachrichten, an deren Inhalt er sich nicht genau "
        "erinnert. Dass Lena die Trennung mit ihrer Familie vorbereitet hat, erlebt er als "
        "Verrat. Lena beschreibt er dabei als ruhig und entschieden.",
        belege=(
            (10, "Ich habe geweint und sie angefleht, auf dem Küchenboden."),
            (13, "Als sie bei ihrem Nein blieb, habe ich Dinge gesagt, die ich nicht sagen wollte."),
            (13, "Was in allen stand, weiß ich nicht mehr genau."),
            (13, "Sie hatte das geplant, mit ihrer Familie, wochenlang"),
            (13, "Sie hat es am Küchentisch gesagt, ganz ruhig"),
        ),
    ),
}

_MARCO_EIGENANTEIL_BIS_KONTEXT = {
    # ── Eigenanteil & Veränderung ────────────────────────────────────────────
    "eig_sicht": Antwort(
        "gut",
        "Marco benennt einzelne eigene Handlungen ausdrücklich als falsch: die erfundene "
        "Krankheit in der Gruppe, das Lesen des Handys, die unvollständige Geschichte im "
        "Freundeskreis, den Satz auf der Treppe. Er gibt zu, eifersüchtig zu sein und öfter "
        "nachgesehen zu haben, als er zunächst sagt. Die Benennung bleibt meist punktuell und "
        "wird im selben Atemzug relativiert. In der letzten Szene reicht die Einsicht erstmals "
        "über Einzelhandlungen hinaus zu dem, was sie antreibt.",
        belege=(
            (5, "Das war falsch, das weiß ich heute."),
            (8, "Ich habe danach noch ein paar Mal nachgesehen. Nicht oft."),
            (12, "Ich weiß, wie das klingt."),
            (3, "Und eifersüchtig auf eine Freundschaft, was ich mir nicht gern eingestehe."),
            (14, "Dass ich nie etwas gefunden habe, habe ich nicht dazugesagt."),
        ),
    ),
    "eig_luecke": Antwort(
        "gut",
        "Vorsichtig beobachtet: Wie sein Schweigen auf Lena gewirkt hat, kommt in Marcos Szenen "
        "nicht vor — er beschreibt es als Ruhe, die er brauchte, und hält Lenas Zeitangabe für "
        "übertrieben. Ebenso wenig kommentiert er, was die Absage ihrer Feier für Lena und ihre "
        "Freundschaften bedeutete, oder dass die Geschichte vom Kollegen Lena im gemeinsamen "
        "Umfeld schadet. Die Parkhaus-Geschichte erwähnt er nur als Anlass für Lenas „Drama“. "
        "Ob ihm diese Stellen nicht bewusst sind oder zu schmerzhaft, lässt das Material offen.",
        belege=(
            (6, "Für mich waren es ein paar schlechte Tage, in denen ich Ruhe gebraucht habe."),
            (5, "Damals kam es mir wie eine Kleinigkeit vor, ihre Freundinnen sieht sie ja ständig."),
            (9, "Im Auto dann wieder Drama."),
            (14, "Das ist ja nicht gelogen. Es gab ihn."),
        ),
    ),
    "eig_ambivalenz": Antwort(
        "gut",
        "Marco schwankt deutlich zwischen Verteidigung und Einsicht. Er will verstehen, was "
        "Lena falsch gemacht hat, und entdeckt dabei eigene Anteile; er fürchtet, dass alles "
        "ihm zugeschrieben wird, und will zugleich nicht, dass sich das Muster wiederholt. Auch "
        "innerhalb einzelner Szenen stehen Schuld und Trotz direkt nebeneinander. Die jüngste "
        "Szene zeigt eine Bewegung hin zur Veränderung, ohne dass die Verteidigung "
        "verschwunden wäre.",
        belege=(
            (12, "Schuldig und gleichzeitig trotzig."),
            (14, "Und seit der Frage von Tobis Frau nicht mehr sicher, ob meine besser ist."),
            (15, "Ich will nicht, dass jetzt alles meine Schuld ist."),
            (15, "Aber ich will auch nicht, dass die Nächste irgendwann ihre Tasche packt und ich wieder nicht verstehe, warum."),
        ),
    ),
    "eig_haltekraefte": Antwort(
        "gut",
        "In der Beziehung hielten Marco vor allem die Sicherheit, die Lena ihm am Anfang gab, "
        "und die Angst, verlassen zu werden. Nach der Trennung halten ihn die Kränkung und der "
        "Wunsch, dass seine Sicht gehört wird, gedanklich in der Beziehung fest. Praktische "
        "Bindungen wie Kinder oder gemeinsamer Besitz spielen in seinen Szenen keine Rolle.",
        belege=(
            (1, "Mit Lena ist das zum ersten Mal anders."),
            (10, "Seitdem gebe ich mir Mühe wie nie."),
            (14, "Ohnmächtig gegen eine Geschichte, die mich zum Täter macht."),
        ),
    ),

    # ── Belastung & Ressourcen ───────────────────────────────────────────────
    "res_belastung": Antwort(
        "gut",
        "Die Belastung ist mittel bis hoch: im Fragebogen 6 von 10, in den Szenen zwischen 1 "
        "und 5. Sie zeigt sich als Panik bei drohendem Verlust, als Erschöpfung nach "
        "monatelanger Anstrengung und als Leere, als Lena von der Dienstreise zurückkommt. "
        "Körperliche Folgen oder Schlafprobleme beschreibt Marco nicht; im Selbstprofil gibt er "
        "an, nach der Trennung schwer zur Ruhe zu kommen.",
        belege=(
            (10, "Panik."),
            (10, "Danach Wochen, in denen ich funktioniert habe wie einer, der eine Prüfung schreibt."),
            (11, "Leer. Und wütend, ohne zu wissen, auf wen."),
            (13, "Stundenlang abwechselnd flehend und wütend."),
        ),
    ),
    "res_ausnahmen": Antwort(
        "gut",
        "Es funktioniert, wenn Marco eine klare Aufgabe hat und gebraucht wird — am deutlichsten "
        "in den Krankenhaustagen. Nach Lenas Trennungsdrohung gelingen ihm über Monate "
        "alltägliche Zuwendung und Gastfreundschaft gegenüber der zuvor abgelehnten Freundin, "
        "allerdings unter großer Anstrengung. In der Beratung hält er eine unbequeme Frage aus "
        "und denkt weiter. Das ist ein Ansatzpunkt: Marco kann sich verändern, wenn er "
        "versteht, wozu.",
        belege=(
            (7, "In der Klinik wusste ich endlich einmal genau, was zu tun ist."),
            (10, "Ich frage, wie ihr Tag war. Ich koche. Ich lade Mira ein."),
            (15, "Auf dem Heimweg ist mir mein Vater eingefallen."),
        ),
    ),
    "res_staerken": Antwort(
        "gut",
        "Belegt sind Verlässlichkeit und Handlungsfähigkeit in Krisen, Planungsfreude und die "
        "Bereitschaft, sich anzustrengen. Zunehmend zeigt sich Reflexionsfähigkeit: Marco hält "
        "eigene Fehler fest, lässt sich von einer Frage verunsichern und verbindet sein "
        "Verhalten mit seiner Geschichte. Dass er freiwillig eine Beratung aufsucht und dabei "
        "bleibt, ist selbst ein Beleg.",
        belege=(
            (7, "Ich habe drei Nächte im Auto geschlafen, und es hat mir nichts ausgemacht."),
            (5, "Ich hatte seit Januar geplant."),
            (8, "Beschämt über mich und gleichzeitig allein mit meiner Unsicherheit."),
            (15, "Seit Juni gehe ich alle zwei Wochen zu einer Männerberatung."),
        ),
    ),
    "res_umfeld": Antwort(
        "duenn",
        "Im Umfeld erscheint vor allem ein Freund, zu dem Marco sich zurückzieht und dem er "
        "seine Sicht der Trennung erzählt; dessen Partnerin stellt die entscheidende kritische "
        "Frage. Die Mutter kommt vor, ohne als Unterstützung beschrieben zu werden. Weitere "
        "tragende Beziehungen nennt Marco nicht. Professionelle Unterstützung besteht seit "
        "Juni.",
        belege=(
            (12, "Also habe ich sie vor dem Haus rausgelassen und bin zu Tobi gefahren."),
            (14, "Aufgefallen ist mir das erst, als Tobis Frau gefragt hat, ob ich mir sicher bin."),
        ),
    ),
    "res_halt": Antwort(
        "duenn",
        "Halt gibt Marco vor allem das Gefühl, gebraucht zu werden und eine Aufgabe zu haben. "
        "Tätigkeiten, Orte oder Überzeugungen, die ihn tragen, nennt er in den Szenen kaum; im "
        "Selbstprofil stehen Sport und Arbeit. In einer Schweigephase wird der Kater zum "
        "einzigen Gegenüber.",
        belege=(
            (7, "Sie hat mich gebraucht, und ich war gut in dem, was ich getan habe."),
            (6, "Ich habe mit dem Kater geredet, weil der wenigstens nichts von mir wollte."),
        ),
    ),

    # ── Sicherheit & Grenzen ─────────────────────────────────────────────────
    "sich_grenzen": Antwort(
        "gut",
        "Grenzverletzungen finden sich vor allem in Marcos eigenem Handeln, und er benennt sie "
        "teils selbst: Er liest Lenas Chat ohne ihr Wissen und sieht danach wiederholt nach, "
        "hinterfragt ihre Ausgaben, sagt ihre Geburtstagsfeier unter falschem Vorwand ab und "
        "erzählt im Freundeskreis eine unbelegte Betrugsgeschichte. Grenzverletzungen durch "
        "Lena beschreibt er nicht; ihre Trennungsankündigungen erlebt er als Druck. Körperliche "
        "oder sexuelle Grenzverletzungen kommen nicht vor.",
        belege=(
            (8, "Ich habe den Chat gelesen."),
            (8, "Ich habe danach noch ein paar Mal nachgesehen."),
            (4, "Ich habe gefragt, wofür sie den Mantel braucht."),
            (5, "Ich habe in die Gruppe geschrieben, dass sie krank ist und wir absagen."),
            (14, "Dass es da diesen Kollegen gab, mit dem sie ständig geschrieben hat."),
        ),
    ),
    "sich_gewalt": Antwort(
        "gut",
        "Körperliche Gewalt wird nicht beschrieben, weder erlebt noch ausgeübt. Kontrolle ist in "
        "Marcos eigenen Szenen belegt: über Kommunikation, Geld und Kontakte. An Heiligabend "
        "fährt er weg, weil er merkt, dass er gleich laut wird — ein Hinweis auf Anspannung, "
        "aber auch auf Steuerungsfähigkeit. Lenas Trennungsankündigungen sind für ihn der "
        "stärkste Druck; Drohungen mit anderen Nachteilen durch Lena beschreibt er nicht.",
        belege=(
            (8, "Am Ende hat sie mir ihren Code gegeben."),
            (3, "Ich habe Lena gesagt, dass Mira sie runterzieht."),
            (12, "Ich habe gemerkt, dass ich gleich laut werde, und das wollte ich nicht"),
            (13, "habe ich Dinge gesagt, die ich nicht sagen wollte"),
        ),
    ),
    "sich_selbst": Antwort(
        "keine",
        "Im freigegebenen Material finden sich keine Äußerungen zu Lebensmüdigkeit oder "
        "Selbstverletzung. Beschrieben sind Panik, Leere und Erschöpfung in "
        "Trennungssituationen; sie lassen sich im Erstgespräch direkt ansprechen.",
    ),
    "sich_erstgespraech": Antwort(
        "gut",
        "Aus dem Material ergeben sich vier Punkte. Erstens: der aktuelle Kontakt zu Lena, "
        "einschließlich der Nachrichten nach der Trennung, an deren Inhalt Marco sich nicht "
        "erinnert. Zweitens: ob er im gemeinsamen Umfeld weiter über Lena erzählt. Drittens: wie "
        "er mit Panik und Leere nach der Trennung umgeht. Viertens: die laufende Beratung — was "
        "dort bearbeitet wird, damit sich Begleitungen ergänzen statt überschneiden.",
        belege=(
            (13, "Was in allen stand, weiß ich nicht mehr genau."),
            (14, "Also habe ich Tobi und ein paar anderen erzählt, wie es wirklich war."),
            (13, "Fassungslos und verlassen."),
            (15, "Seit Juni gehe ich alle zwei Wochen zu einer Männerberatung."),
        ),
    ),

    # ── Kontext & System ─────────────────────────────────────────────────────
    "kon_beteiligte": Antwort(
        "gut",
        "Neben Lena kommen vor: ihre beste Freundin, die das Paar zusammengebracht hat und die "
        "Marco als Gegenspielerin erlebt; Lenas Schwester, die bei der Trennung im Auto wartet; "
        "ein Kollege Lenas, dessen Nachricht Marcos Misstrauen auslöst; Lenas Vater mit dem "
        "Herzinfarkt. Auf Marcos Seite stehen seine Mutter, ein Freund und dessen Partnerin "
        "sowie ein Berater. Biografisch wichtigste abwesende Person ist der Vater, der die "
        "Familie verließ, als Marco elf war.",
        belege=(
            (3, "Mira hat uns zusammengebracht"),
            (13, "Ihre Schwester hat unten im Auto gewartet."),
            (8, "Jonas."),
            (1, "Mein Vater ist gegangen, als ich elf war."),
            (15, "Das habe ich dem Berater in der ersten Stunde auch so gesagt."),
        ),
    ),
    "kon_kinder": Antwort(
        "keine",
        "Gemeinsame Kinder gibt es nicht; im Selbstprofil gibt Marco an, keine Kinder zu haben. "
        "In den Szenen kommt Kindheit nur als seine eigene Vorgeschichte vor.",
    ),
    "kon_lebenslage": Antwort(
        "duenn",
        "Laut Fragebogen lebten beide zwei Jahre in Marcos Wohnung. Geld ist ein "
        "wiederkehrendes Konfliktthema, das Marco als Sparsamkeit und Planung beschreibt; eine "
        "eigene größere Ausgabe begründet er gesundheitlich. Zu Arbeit und Wohnsituation nach "
        "der Trennung macht er in den Szenen kaum Angaben.",
        belege=(
            (4, "Einer von uns muss aufs Geld achten"),
            (4, "Das Rennrad war etwas anderes, das brauche ich für meinen Rücken"),
        ),
    ),
    "kon_vorbehandlung": Antwort(
        "duenn",
        "Seit Juni 2026 besucht Marco alle zwei Wochen eine Männerberatung. Er kam mit dem "
        "Ziel, Lenas Fehler zu verstehen, und beschreibt, wie sich seine Sicht dort verändert. "
        "Frühere Therapie, Medikation oder Klinikaufenthalte erwähnt er nicht.",
        belege=(
            (15, "Seit Juni gehe ich alle zwei Wochen zu einer Männerberatung."),
        ),
    ),
}

#: Lena, wie sie in Marcos Szenen erscheint. Acht von zwölf Achsen bleiben unter zwei
#: Belegen, keiner der vier Anteile ist beurteilbar — Marcos Szenen belegen mehr über den
#: Schreibenden als über die beschriebene Person, und genau das soll hier sichtbar werden.
_MARCO_ACHSEN = {
    "impulsivitaet": Auspraegung(
        25,
        "Marco beschreibt eine einzige Stelle, die er als unüberlegtes Handeln deutet. Für eine "
        "Zahl reicht das nicht.",
        belege=(
            (4, "sie kauft, wenn es ihr schlecht geht"),
        ),
    ),
    "affekt": Auspraegung(
        30,
        "Marco beschreibt Kränkung und Verstimmung nach Konflikten, aber keine raschen, starken "
        "Wechsel der Gefühlslage. Bei der Trennung erscheint Lena ausdrücklich ruhig.",
        belege=(
            (2, "war den ganzen Abend beleidigt"),
            (11, "Sie hat wieder dieses Gesicht gemacht."),
        ),
        gegenbelege=(
            (13, "Sie hat es am Küchentisch gesagt, ganz ruhig"),
        ),
    ),
    "grandiositaet": Auspraegung(
        15,
        "Anspruchshaltung oder Herabsetzung anderer durch Lena beschreibt Marco nicht.",
    ),
    "empathie": Auspraegung(
        40,
        "Marco vermisst an einer Stelle, dass Lena seine Unsicherheit sieht; an einer anderen "
        "nimmt sie seine Kritik auf. Beides zusammen ist zu wenig für eine Zahl.",
        belege=(
            (8, "und nicht darüber, warum ich so unsicher war"),
        ),
        gegenbelege=(
            (2, "Sie hat sich sofort entschuldigt"),
        ),
    ),
    "verlassenheit": Auspraegung(
        10,
        "Angst vor Verlassenwerden zeigt sich in Marcos Szenen bei ihm selbst, nicht bei Lena.",
    ),
    "idealisierung": Auspraegung(
        12,
        "Ein Wechsel von Auf- und Abwertung durch Lena ist nicht beschrieben.",
    ),
    "dramatisierung": Auspraegung(
        30,
        "Marco nennt Lenas Reaktion einmal Drama; die geschilderte Situation zeigt eher "
        "Kränkung als Zuspitzung. Ein einzelnes Etikett ist kein Beleg für ein Muster.",
        belege=(
            (9, "Im Auto dann wieder Drama."),
        ),
    ),
    "grenzen": Auspraegung(
        10,
        "Grenzüberschreitungen durch Lena beschreibt Marco nicht; die Grenzverletzungen in "
        "seinen Szenen gehen von ihm aus.",
    ),
    "reue": Auspraegung(
        60,
        "Nach Konflikten entschuldigt sich Lena in Marcos Schilderung wiederholt. Ob dem ein "
        "eigenes verletzendes Verhalten vorausging, lässt das Material offen.",
        belege=(
            (2, "Sie hat sich sofort entschuldigt"),
            (6, "Irgendwann hat sie sich entschuldigt, und dann ging es wieder."),
        ),
    ),
    "selbstbild": Auspraegung(
        64,
        "Marco beschreibt Lena als beruflich sicher und bei der Trennung gefasst; Hinweise auf "
        "ein schwankendes Selbstbild fehlen. Die Belege sind indirekt.",
        belege=(
            (13, "Sie hat es am Küchentisch gesagt, ganz ruhig"),
            (11, "Abteilungsleiterin."),
        ),
    ),
    "verantwortung": Auspraegung(
        55,
        "Eine Entschuldigung spricht für Übernahme, Marcos Eindruck, Lena schiebe ihm die "
        "ganze Schuld zu, dagegen. Beides ist zu dünn für eine Zahl.",
        belege=(
            (6, "Irgendwann hat sie sich entschuldigt"),
        ),
        gegenbelege=(
            (14, "Lena überall erzählt, ich sei kontrollierend und kalt gewesen"),
        ),
    ),
    "einfluss": Auspraegung(
        38,
        "Steuerung zeigt sich in Marcos Schilderung an einer Stelle deutlich: Lena kündigt "
        "mehrfach Trennung an, was sein Verhalten unmittelbar und dauerhaft verändert. Andere "
        "Formen von Druck, Schuld oder Entzug beschreibt er nicht.",
        belege=(
            (10, "Wenn das so weitergeht, gehe ich."),
            (10, "Sie hat den Satz vorher schon gesagt, im Sommer und im Herbst"),
        ),
    ),
}

MARCO = FallFaq(
    antworten={
        **_MARCO_AUFTRAG_BIS_VERLAUF, **_MARCO_PERSON_UND_BINDUNG,
        **_MARCO_EIGENANTEIL_BIS_KONTEXT,
    },
    achsen=_MARCO_ACHSEN,
    materiallage={
        "umfang": (
            "15 Szenen von September 2023 bis August 2026, dazu Fragebogen, Selbstprofil und "
            "eine Einschätzung Lenas. Die meisten Szenen handeln von Marcos eigenem Erleben und "
            "Handeln."
        ),
        "luecken": (
            "Über Lenas Verhalten enthält das Material wenig Beobachtbares; es beschreibt vor "
            "allem, wie Marco es gedeutet hat. Acht von zwölf Achsen bleiben deshalb ohne "
            "belastbaren Wert, und keiner der vier Anteile ist beurteilbar."
        ),
        "einseitigkeit": (
            "Alle Szenen stammen von Marco. Sie belegen mehr über das Verhalten des Schreibenden "
            "als über die beschriebene Person; ein Merkmalsbild Lenas lässt sich daraus kaum "
            "gewinnen. Neben Lenas Fall gelegt, zeigt die Paar-Analyse, wo sich beide "
            "Schilderungen decken."
        ),
    },
)
