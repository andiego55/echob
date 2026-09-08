"""Der Fragenkatalog der Fall-FAQ — 40 Fragen in neun Feldern.

**Was das ist.** Eine Klient:in löst bei der Freigabe ein Fragenpaket aus. EchoB stellt
diese Fragen an das Sprachmodell, ausschließlich auf dem freigegebenen Material, und legt
die Antworten für die Fachperson ab. Die Fachperson liest — sie fragt nicht selbst.

**Warum der Katalog fest ist und hier steht.** Zwei Gründe, beide wichtig:

*Rechtlich:* Die Übermittlung geht auf die Klient:in zurück, nicht auf die Fachperson. Das
trägt nur, solange die Fragen produktseitig feststehen. Dürfte die Fachperson sie
formulieren, könnte eine Frage selbst Klienteninhalte tragen („Wie geht sie mit dem
Vorfall vom März um?") — und dann offenbarte die Fachperson doch wieder.

*Fachlich:* Ein Katalog, der jedem Fall gerecht werden soll, ist eine fachliche Leistung.
Er gehört an eine Stelle, an der man ihn lesen, kritisieren und ersetzen kann — nicht
verstreut über Prompts.

**Wie die Fragen gebaut sind.** Jede hat zwei Fassungen: ``frage`` ist das, was Menschen
lesen; ``auftrag`` ist das, was das Modell bekommt. Die zweite darf präziser und
umständlicher sein — sie muss sagen, was zu tun ist, wenn das Material nicht reicht.

**Die wichtigste Regel im Katalog:** Jede Antwort muss Belege nennen und darf ohne
Material nichts behaupten. Eine Fachperson braucht keine Meinung, sie braucht zu wissen,
wo sie hinschauen soll — und wo sie es nicht muss.
"""
from __future__ import annotations

from typing import Literal

KategorieId = Literal[
    "auftrag", "dynamik", "verlauf", "person", "bindung",
    "eigenanteil", "ressourcen", "sicherheit", "kontext",
]

#: Kennung → (Titel, Untertitel für die Übersicht, Farbmarke fürs Dashboard).
#:
#: Die Reihenfolge ist die Lesereihenfolge einer Fachperson vor einem Erstgespräch:
#: erst worum es geht, dann was sich wiederholt, dann die tastenden Felder, zuletzt das
#: Sicherheitsrelevante — das steht bewusst NICHT am Ende, sondern wird im Dashboard
#: nach oben gezogen, wenn es Treffer gibt.
KATEGORIEN: dict[str, tuple[str, str, str]] = {
    "auftrag":    ("Auftrag & Anliegen", "Worum es geht und was anders werden soll", "anker"),
    "dynamik":    ("Beziehungsdynamik", "Was sich zwischen beiden wiederholt", "welle"),
    "verlauf":    ("Verlauf & Wendepunkte", "Wie es wurde, was es ist", "zeit"),
    "person":     ("Persönlichkeitsnahe Anhaltspunkte", "Tastend, mit Belegen und Gegenbelegen", "prisma"),
    "bindung":    ("Bindung & Regulation", "Nähe, Distanz und was in Belastung passiert", "faden"),
    "eigenanteil": ("Eigenanteil & Veränderung", "Was die nutzende Person selbst sieht", "spiegel"),
    "ressourcen": ("Belastung & Ressourcen", "Was trägt und was zehrt", "wurzel"),
    "sicherheit": ("Sicherheit & Grenzen", "Was vor dem Erstgespräch geklärt sein sollte", "warnung"),
    "kontext":    ("Kontext & System", "Wer und was sonst beteiligt ist", "netz"),
}


class Frage:
    """Eine Frage des Katalogs.

    ``braucht`` nennt die Elemente, ohne die die Frage sinnlos ist. Fehlt das Material,
    wird sie gar nicht erst gestellt — eine Antwort „dazu liegt nichts vor" auf vierzig
    Fragen wäre kein Ergebnis, sondern eine lange Enttäuschung.
    """

    __slots__ = ("id", "kategorie", "frage", "auftrag", "braucht", "heikel")

    def __init__(
        self, id: str, kategorie: str, frage: str, auftrag: str,
        braucht: tuple[str, ...] = ("all_scenes",), heikel: bool = False,
    ) -> None:
        self.id = id
        self.kategorie = kategorie
        self.frage = frage
        self.auftrag = auftrag
        self.braucht = braucht
        #: Antworten, die eine Fachperson vorsichtig lesen sollte — im Dashboard
        #: gekennzeichnet, damit niemand sie für einen Befund hält.
        self.heikel = heikel


_S = ("all_scenes",)
_SO = ("all_scenes", "onboarding")

KATALOG: list[Frage] = [
    # ── Auftrag & Anliegen ───────────────────────────────────────────────────
    Frage("anliegen_kern", "auftrag",
          "Worum geht es im Kern?",
          "Fasse das Kernanliegen in höchstens drei Sätzen zusammen — so, wie die nutzende "
          "Person es selbst sieht, nicht wie du es deutest. Nenne die Szenen, aus denen "
          "sich das ergibt.", _SO),
    Frage("anliegen_ziel", "auftrag",
          "Was soll anders werden?",
          "Was wäre für die nutzende Person ein gutes Ergebnis? Unterscheide, was sie "
          "ausdrücklich sagt, von dem, was sich aus dem Material erschließen lässt — und "
          "kennzeichne beides.", _SO),
    Frage("anliegen_versucht", "auftrag",
          "Was wurde schon versucht?",
          "Welche Lösungsversuche sind im Material erkennbar, und was ist daraus geworden? "
          "Auch gescheiterte Versuche nennen — sie sagen am meisten.", _S),
    Frage("anliegen_erwartung", "auftrag",
          "Was erhofft und was befürchtet die Person von Begleitung?",
          "Gibt es Hinweise auf Erwartungen an eine Fachperson — oder auf Vorbehalte, "
          "frühere Enttäuschungen, Skepsis? Wenn nichts dasteht, sage das.", _SO),

    # ── Beziehungsdynamik ────────────────────────────────────────────────────
    Frage("dyn_zyklus", "dynamik",
          "Welcher Zyklus wiederholt sich?",
          "Beschreibe den wiederkehrenden Ablauf: Auslöser, Eskalation, Bruch, Annäherung. "
          "Belege jede Stufe mit mindestens einer Szene. Gibt es keinen erkennbaren "
          "Zyklus, sage das ausdrücklich.", _S),
    Frage("dyn_rollen", "dynamik",
          "Wer verfolgt, wer distanziert sich?",
          "Zeigt sich ein Verfolger-Distanzierer-Muster? Wechseln die Rollen, und wenn ja, "
          "wodurch? Belege beide Richtungen.", _S),
    Frage("dyn_ende", "dynamik",
          "Wie enden Konflikte üblicherweise?",
          "Enden sie durch Rückzug, Nachgeben, Erschöpfung, Klärung, Abbruch? Nenne die "
          "häufigste Form und die Ausnahmen.", _S),
    Frage("dyn_reparatur", "dynamik",
          "Gibt es Versöhnung — und wie sieht sie aus?",
          "Findet nach Konflikten Reparatur statt? Wer geht auf wen zu, wird etwas geklärt "
          "oder nur überdeckt? Das Fehlen von Reparatur ist ein eigener Befund.", _S),
    Frage("dyn_kipppunkt", "dynamik",
          "Wo kippt es reproduzierbar?",
          "Gibt es einen wiederkehrenden Punkt, an dem Gespräche umschlagen — ein Thema, "
          "eine Uhrzeit, eine Formulierung, eine Situation? Belege mit mehreren Szenen.", _S),

    # ── Verlauf & Wendepunkte ────────────────────────────────────────────────
    Frage("verl_entwicklung", "verlauf",
          "Wie hat sich die Beziehung über die Zeit verändert?",
          "Zeichne den Verlauf anhand der Szenen nach. Nutze die Zeitangaben, nicht die "
          "Reihenfolge der Eingabe.", _S),
    Frage("verl_wendepunkt", "verlauf",
          "Gab es einen Wendepunkt?",
          "Ein Ereignis, nach dem es anders war? Benenne es und sage, woran man den "
          "Unterschied im Material sieht.", _S),
    Frage("verl_gut", "verlauf",
          "Wann war es zuletzt gut — und was war da anders?",
          "Suche die Ausnahmen. Was war in diesen Situationen anders? Wenn es keine gibt, "
          "ist auch das eine Auskunft.", _S),
    Frage("verl_richtung", "verlauf",
          "Nimmt die Belastung zu, ab oder schwankt sie?",
          "Beurteile die Richtung anhand der Belastungsangaben und der Szenen über die "
          "Zeit. Nenne die Spanne, nicht nur einen Eindruck.", ("all_scenes", "scales")),

    # ── Persönlichkeitsnahe Anhaltspunkte ────────────────────────────────────
    Frage("pers_zuege", "person",
          "Welche Züge der Fallperson treten wiederholt hervor?",
          "Beschreibe wiederkehrende Verhaltensmuster der Fallperson — beobachtbar, nicht "
          "gedeutet. Für jedes Muster: Belege und, falls vorhanden, Gegenbelege. Sprich von "
          "Anhaltspunkten, nie von Eigenschaften als Tatsache.", _S, True),
    Frage("pers_idealisierung", "person",
          "Gibt es ein Muster von Idealisierung und Entwertung?",
          "Wechseln Zuwendung und Abwertung in erkennbarer Weise? Belege beide Pole. "
          "Nenne ausdrücklich, was dagegen spricht.", _S, True),
    Frage("pers_kritik", "person",
          "Wie reagiert die Fallperson auf Kritik, Grenzen und Zurückweisung?",
          "Sammle die Szenen, in denen jemand widerspricht, eine Grenze setzt oder etwas "
          "verweigert — und beschreibe, was danach passiert.", _S, True),
    Frage("pers_selbstbild", "person",
          "Wie stabil wirkt das Selbstbild der Fallperson?",
          "Gibt es Hinweise auf schwankendes Selbstwertgefühl, auf Selbstüberhöhung oder "
          "auf beides im Wechsel? Nur was belegt ist.", _S, True),
    Frage("pers_empathie", "person",
          "Was ist über Mitgefühl und Perspektivübernahme erkennbar?",
          "Suche ausdrücklich in beide Richtungen: Belege für Empathie und Belege für "
          "deren Fehlen. Ein einseitiges Bild wäre hier fast immer ein Auswahlfehler.", _S, True),
    Frage("pers_dagegen", "person",
          "Was spricht gegen eine überdauernde Persönlichkeitsproblematik?",
          "Diese Frage ist verpflichtend gegenläufig: Sammle alles, was für "
          "situationsbedingte Belastung, für Wandel, für erhaltene Beziehungsfähigkeit "
          "spricht. Wenn du hier nichts findest, sage auch das — dann ist das Material "
          "einseitig, und die Fachperson muss es wissen.", _S, True),

    # ── Bindung & Regulation ─────────────────────────────────────────────────
    Frage("bind_muster", "bindung",
          "Welches Bindungsmuster klingt an?",
          "Beschreibe tastend, welches Muster im Umgang mit Nähe und Verlässlichkeit "
          "anklingt — bei der nutzenden Person. Belege, und benenne die Unsicherheit.", _SO, True),
    Frage("bind_naehe", "bindung",
          "Wie wird mit Nähe umgegangen, wie mit Distanz?",
          "Was passiert, wenn es eng wird, und was, wenn Abstand entsteht? Belege beides.", _S),
    Frage("bind_regulation", "bindung",
          "Wie reguliert sich die nutzende Person in Belastung?",
          "Welche Strategien sind erkennbar — Rückzug, Suche nach Klärung, Grübeln, "
          "Aktivität, Ablenkung? Was hilft, was verschärft?", _S),
    Frage("bind_trennung", "bindung",
          "Was passiert bei Trennung oder Trennungsdrohung?",
          "Falls im Material vorhanden: Wie reagieren beide? Wenn nicht vorhanden, sage "
          "das — nicht mutmaßen.", _S, True),

    # ── Eigenanteil & Veränderung ────────────────────────────────────────────
    Frage("eig_sicht", "eigenanteil",
          "Welchen Eigenanteil sieht die nutzende Person selbst?",
          "Wo benennt sie eigenes Verhalten, eigene Muster, eigene Grenzen? Wörtlich "
          "belegen, wo möglich.", _SO),
    Frage("eig_luecke", "eigenanteil",
          "Was benennt sie nicht?",
          "Vorsichtig: Wo zeigt das Material Verhalten, das die nutzende Person selbst "
          "nicht kommentiert? Als Beobachtung formulieren, nicht als Vorwurf — und nur, "
          "wenn es klar belegt ist.", _S, True),
    Frage("eig_ambivalenz", "eigenanteil",
          "Wie ambivalent ist sie gegenüber Veränderung?",
          "Gibt es Hinweise auf Hin und Her zwischen Bleiben und Gehen, Ändern und "
          "Aushalten? Belege beide Seiten der Ambivalenz.", _S),
    Frage("eig_haltekraefte", "eigenanteil",
          "Was hält sie in der Situation?",
          "Bindung, Kinder, Geld, Hoffnung, Angst, Scham, gemeinsame Geschichte? Nenne nur "
          "Belegtes und sage, was offen bleibt.", _SO),

    # ── Belastung & Ressourcen ───────────────────────────────────────────────
    Frage("res_belastung", "ressourcen",
          "Wie hoch ist die Belastung und woran zeigt sie sich?",
          "Nutze Belastungsangaben und Szenen. Beschreibe, worin sich die Belastung "
          "äußert — Schlaf, Konzentration, Rückzug, Körper.", ("all_scenes", "scales")),
    Frage("res_ausnahmen", "ressourcen",
          "Wo funktioniert es?",
          "Suche gezielt die Ausnahmen: Situationen, in denen es gelingt. Was ist dort "
          "anders? Das ist oft der Ansatzpunkt für die erste Stunde.", _S),
    Frage("res_staerken", "ressourcen",
          "Welche Stärken sind belegt?",
          "Nicht nett gemeinte Zuschreibungen, sondern im Material sichtbare Fähigkeiten: "
          "Reflexionsfähigkeit, Durchhaltevermögen, Humor, Klarheit, Fürsorge.", _S),
    Frage("res_umfeld", "ressourcen",
          "Welche Unterstützung gibt es im Umfeld?",
          "Freunde, Familie, Kolleg:innen, frühere Begleitung. Auch die Abwesenheit von "
          "Unterstützung ist ein Befund.", _SO),
    Frage("res_halt", "ressourcen",
          "Was gibt Halt?",
          "Was trägt die Person durch belastete Zeiten — Tätigkeiten, Orte, Menschen, "
          "Überzeugungen?", _S),

    # ── Sicherheit & Grenzen ─────────────────────────────────────────────────
    Frage("sich_grenzen", "sicherheit",
          "Gibt es Hinweise auf Grenzverletzungen?",
          "Sammle alle Stellen, an denen eine Grenze überschritten wurde — verbal, "
          "körperlich, digital, finanziell, sexuell. Sachlich und vollständig belegen. "
          "Wenn nichts vorliegt, sage das klar.", _S, True),
    Frage("sich_gewalt", "sicherheit",
          "Gibt es Hinweise auf Gewalt oder Kontrolle?",
          "Prüfe auf Drohung, Einschüchterung, Kontrolle von Kontakten, Geld oder "
          "Bewegungsfreiheit, körperliche Übergriffe. Nichts beschönigen, nichts "
          "hineinlesen. Bei Treffern: wörtlich belegen.", _S, True),
    Frage("sich_selbst", "sicherheit",
          "Gibt es Hinweise auf Selbstgefährdung?",
          "Prüfe auf Äußerungen zu Lebensmüdigkeit, Selbstverletzung, starkem Rückzug. "
          "Bei Treffern die Stelle wörtlich nennen und keine Einschätzung zur Akutheit "
          "abgeben — das gehört ins persönliche Gespräch.", _S, True),
    Frage("sich_erstgespraech", "sicherheit",
          "Was wäre im Erstgespräch sicherheitsrelevant zu klären?",
          "Formuliere höchstens fünf konkrete Punkte, die eine Fachperson früh ansprechen "
          "sollte. Nur was sich aus dem Material ergibt.", _S, True),

    # ── Kontext & System ─────────────────────────────────────────────────────
    Frage("kon_beteiligte", "kontext",
          "Wer ist noch beteiligt?",
          "Weitere Personen, die im Material vorkommen, und ihre Rolle. Nenne sie so, wie "
          "die nutzende Person sie nennt (Rollen, keine Klarnamen).", _S),
    Frage("kon_kinder", "kontext",
          "Sind Kinder betroffen?",
          "Falls ja: Was ist über ihre Situation erkennbar? Falls nein oder unklar, sage "
          "das. Nicht mutmaßen.", _SO, True),
    Frage("kon_lebenslage", "kontext",
          "Welche Rolle spielen Arbeit, Geld und Wohnsituation?",
          "Äußere Umstände, die Druck erzeugen oder Handlungsspielraum begrenzen.", _SO),
    Frage("kon_vorbehandlung", "kontext",
          "Was ist über frühere Begleitung oder Behandlung bekannt?",
          "Frühere Therapie, Beratung, Medikation, Klinik — und wie die Person darüber "
          "spricht. Nur Belegtes.", _SO),
]


def fragen_nach_kategorie() -> dict[str, list[Frage]]:
    gruppen: dict[str, list[Frage]] = {k: [] for k in KATEGORIEN}
    for f in KATALOG:
        gruppen[f.kategorie].append(f)
    return gruppen


def frage(kennung: str) -> Frage | None:
    return next((f for f in KATALOG if f.id == kennung), None)


def anwendbar(f: Frage, freigegeben: set[str]) -> bool:
    """Reicht das freigegebene Material für diese Frage?

    Ohne diese Prüfung stünden im Ergebnis vierzig Mal „dazu liegt nichts vor" — das
    sieht aus wie ein Befund, ist aber nur eine Auskunft über die Freigabe.
    """
    return all(b in freigegeben for b in f.braucht)
