"""Die Merkmalsachsen der Fall-FAQ — und warum jede Zahl ihre Belege mitträgt.

**Worum es geht.** Neben den vierzig Fragen liefert die Fall-FAQ ein Merkmalsbild: zwölf
beobachtungsnahe Achsen und vier Cluster-B-Anteile, jeweils mit einer Ausprägung zwischen
0 und 100. Das ist der heikelste Teil des Features, und diese Datei ist der Ort, an dem
die Sicherungen sitzen.

**Warum überhaupt Zahlen.** Weil „deutliche Hinweise auf Impulsivität" nichts darüber sagt,
wie deutlich, im Vergleich wozu, und auf wie viel Material gestützt. Eine Zahl mit
Belegdichte daneben ist ehrlicher als ein Adjektiv, das dieselbe Unsicherheit versteckt.

**Warum die Achsen hier feststehen.** Dürfte das Modell seine Achsen je Fall selbst
wählen, wären zwei Fälle nie vergleichbar, und ein auffälliger Wert entstünde manchmal
schon dadurch, dass die Achse überhaupt gewählt wurde. Feste Achsen erzwingen außerdem,
dass eine unauffällige Achse als unauffällig ausgewiesen wird, statt zu fehlen.

**Die drei Regeln, die im Produkt durchgesetzt werden:**

1. *Keine nackte Zahl.* Jede Ausprägung trägt Belege und, wo vorhanden, Gegenbelege. Ohne
   Belege wird sie nicht angezeigt — siehe ``belastbar()``.
2. *Belegdichte statt Selbsteinschätzung.* Wie sicher ein Wert ist, ergibt sich aus der
   Zahl der Belege, nicht aus einer Angabe des Modells über sich selbst.
3. *Anteile, keine Diagnosen.* Die vier Cluster-B-Achsen heißen im Produkt „Anteile" und
   „Anklänge". Sie sind Beschreibungen von Mustern im freigegebenen Material, nicht
   Aussagen über eine Person — und schon gar nicht über eine Person, die hier nie zu Wort
   kommt.

**Der blinde Fleck, der im Produkt benannt werden muss.** Das Material stammt von *einer*
Seite. Die beschriebene Person hat nichts eingereicht, nichts widersprochen und weiß in
aller Regel nichts davon. Ein Merkmalsbild aus solchem Material sagt zuverlässig etwas
über die *Schilderung* und nur mit Vorbehalt etwas über die geschilderte Person. Diese
Einschränkung steht nicht im Kleingedruckten, sondern über dem Diagramm.
"""
from __future__ import annotations

#: Wie viele Belege eine Ausprägung mindestens braucht, um überhaupt gezeigt zu werden.
#: Ein einzelner Beleg ist eine Episode, kein Muster — und ein Muster ist das, was hier
#: behauptet wird.
MIN_BELEGE = 2

#: Ab dieser Belegzahl gilt eine Achse als gut gestützt.
GUT_GESTUETZT_AB = 4


class Achse:
    """Eine Merkmalsachse.

    ``frage`` ist der Satz, den das Modell für diese Achse beantwortet — bewusst als
    Beobachtungsfrage formuliert und nicht als Eigenschaft, nach der man sucht.
    """

    __slots__ = ("id", "name", "frage", "pol_niedrig", "pol_hoch")

    def __init__(self, id: str, name: str, frage: str, pol_niedrig: str, pol_hoch: str) -> None:
        self.id = id
        self.name = name
        self.frage = frage
        #: Was ein niedriger bzw. hoher Wert bedeutet. Ohne diese Beschriftung liest sich
        #: jede Skala als „viel ist schlimm" — bei „Reue und Wiedergutmachung" wäre das
        #: genau verkehrt herum.
        self.pol_niedrig = pol_niedrig
        self.pol_hoch = pol_hoch


ACHSEN: list[Achse] = [
    Achse("impulsivitaet", "Impulsivität",
          "Wie oft folgt auf einen Auslöser unmittelbar eine Handlung, ohne erkennbare Pause?",
          "abwägend", "unmittelbar"),
    Achse("affekt", "Affektschwankung",
          "Wie stark und wie schnell wechseln die geschilderten Gefühlslagen?",
          "gleichbleibend", "stark schwankend"),
    Achse("grandiositaet", "Grandiosität und Anspruch",
          "Wie häufig zeigen sich Sonderstellung, Anspruchshaltung oder Herabsetzung anderer?",
          "nicht erkennbar", "durchgängig"),
    Achse("empathie", "Perspektivübernahme",
          "Wie oft wird die Sicht oder das Erleben anderer erkennbar berücksichtigt?",
          "selten erkennbar", "regelmäßig erkennbar"),
    Achse("verlassenheit", "Verlassenheitsangst",
          "Wie deutlich reagiert die Person auf drohende Trennung oder Distanz?",
          "nicht erkennbar", "sehr deutlich"),
    Achse("idealisierung", "Idealisierung und Entwertung",
          "Wie ausgeprägt wechseln Aufwertung und Abwertung derselben Person?",
          "nicht erkennbar", "stark wechselnd"),
    Achse("dramatisierung", "Dramatisierung",
          "Wie stark wird Aufmerksamkeit durch Zuspitzung oder Inszenierung hergestellt?",
          "nicht erkennbar", "durchgängig"),
    Achse("grenzen", "Grenzüberschreitung",
          "Wie häufig werden Grenzen anderer übergangen — verbal, räumlich, digital, finanziell?",
          "nicht erkennbar", "wiederholt"),
    Achse("reue", "Reue und Wiedergutmachung",
          "Wie oft folgt auf Verletzendes eine erkennbare Wiedergutmachung?",
          "bleibt aus", "regelmäßig"),
    Achse("selbstbild", "Selbstbildstabilität",
          "Wie beständig ist das geschilderte Selbstbild über die Zeit?",
          "stark schwankend", "beständig"),
    Achse("verantwortung", "Verantwortungsübernahme",
          "Wie oft wird eigener Anteil benannt, statt ihn zu verschieben?",
          "wird verschoben", "wird benannt"),
    Achse("einfluss", "Steuerndes Verhalten",
          "Wie häufig wird Verhalten anderer über Druck, Schuld oder Entzug gesteuert?",
          "nicht erkennbar", "wiederholt"),
]

#: Achsen, bei denen ein HOHER Wert das Unauffällige ist. Ohne diese Liste färbt eine
#: Oberfläche „Reue: 80" rot, weil sie hohe Zahlen für schlecht hält.
POSITIV_GEPOLT: frozenset[str] = frozenset({"empathie", "reue", "selbstbild", "verantwortung"})


class ClusterAnteil:
    """Ein Cluster-B-Anteil — als Muster beschrieben, nicht als Diagnose benannt."""

    __slots__ = ("id", "name", "beschreibung", "achsen", "gegenachsen")

    def __init__(
        self, id: str, name: str, beschreibung: str,
        achsen: tuple[str, ...], gegenachsen: tuple[str, ...] = (),
    ) -> None:
        self.id = id
        self.name = name
        self.beschreibung = beschreibung
        #: Achsen, deren hohe Ausprägung für diesen Anteil spricht.
        self.achsen = achsen
        #: Achsen, deren hohe Ausprägung dagegen spricht. Sie sind der Grund, warum ein
        #: Anteil auch wieder sinken kann — ohne sie addierte sich jedes Merkmal nur nach
        #: oben, und am Ende wäre jeder Fall auffällig.
        self.gegenachsen = gegenachsen


CLUSTER_ANTEILE: list[ClusterAnteil] = [
    ClusterAnteil(
        "instabilitaet", "Instabilitätsnahe Anteile",
        "Muster aus starken Gefühlsschwankungen, Angst vor Verlassenwerden und "
        "wechselnder Bewertung nahestehender Menschen.",
        ("affekt", "verlassenheit", "idealisierung", "impulsivitaet"),
        ("selbstbild",),
    ),
    ClusterAnteil(
        "grandiositaet", "Grandiositätsnahe Anteile",
        "Muster aus Anspruchshaltung, Sonderstellung und wenig erkennbarer "
        "Perspektivübernahme.",
        ("grandiositaet", "einfluss"),
        ("empathie", "verantwortung"),
    ),
    ClusterAnteil(
        "inszenierung", "Inszenierungsnahe Anteile",
        "Muster aus Zuspitzung, starker Außenwirkung und stark wechselnden Gefühlslagen.",
        ("dramatisierung", "affekt"),
        (),
    ),
    ClusterAnteil(
        "grenzueberschreitung", "Grenzüberschreitende Anteile",
        "Muster aus wiederholtem Übergehen von Grenzen und ausbleibender "
        "Wiedergutmachung.",
        ("grenzen", "impulsivitaet", "einfluss"),
        ("reue", "empathie"),
    ),
]


def achse(kennung: str) -> Achse | None:
    return next((a for a in ACHSEN if a.id == kennung), None)


def belastbar(anzahl_belege: int) -> bool:
    """Darf eine Ausprägung mit so vielen Belegen überhaupt angezeigt werden?"""
    return anzahl_belege >= MIN_BELEGE


def belegdichte(anzahl_belege: int) -> str:
    """``keine`` | ``duenn`` | ``tragfaehig`` | ``gut`` — die Aussage neben jeder Zahl.

    Bewusst aus der Belegzahl abgeleitet und nicht vom Modell erfragt: Eine
    Selbsteinschätzung der eigenen Sicherheit ist genau das, worin Sprachmodelle
    unzuverlässig sind.
    """
    if anzahl_belege <= 0:
        return "keine"
    if anzahl_belege < MIN_BELEGE:
        return "duenn"
    if anzahl_belege < GUT_GESTUETZT_AB:
        return "tragfaehig"
    return "gut"


def anteil_aus_achsen(anteil: ClusterAnteil, werte: dict[str, int]) -> int | None:
    """Rechnet einen Cluster-Anteil aus den Achsenwerten — oder gibt ``None`` zurück.

    ``None``, sobald eine der tragenden Achsen fehlt. Das ist der Unterschied zwischen
    „unauffällig" und „nicht beurteilbar", und er darf nicht verlorengehen: Ein aus zwei
    von vier Achsen gemittelter Wert sähe genauso aus wie ein vollständiger und wäre doch
    etwas ganz anderes.

    Die Gegenachsen ziehen ab, wiegen aber nur halb so schwer wie die tragenden — sonst
    könnte ein einzelner positiver Wert ein belegtes Muster wegrechnen.
    """
    tragend = [werte[a] for a in anteil.achsen if a in werte]
    if len(tragend) < len(anteil.achsen):
        return None
    roh = sum(tragend) / len(tragend)

    gegen = [werte[a] for a in anteil.gegenachsen if a in werte]
    if gegen:
        # Gegenachsen sind positiv gepolt: ein hoher Wert spricht GEGEN den Anteil.
        entlastung = sum(gegen) / len(gegen)
        roh = (roh * 2 + (100 - entlastung)) / 3

    return max(0, min(100, round(roh)))
