"""Die beiden Beispielfälle der Spielwiese — eine Beziehung, zwei Innensichten.

**Wozu.** Jede Fachperson sieht als Erstes Lena und Marco. Die beiden sind das Schaufenster
des Fachpersonenbereichs: An ihnen probiert man Echo, Berichte, Hypothesen, die Fall-FAQ und
die Paar-Analyse aus, bevor es einen echten Menschen gibt. Ein Beispielfall, der wie ein
Formular klingt, führt vor, dass das Werkzeug mit Formularen arbeitet.

**Was die Fälle zeigen sollen**, und woran man es in dieser Datei sieht:

*Szenen, wie Menschen sie wirklich festhalten.* Eine Zeile an einem Abend, an dem nicht
mehr ging; eine halbe Seite an dem Tag, der alles verändert hat. Deshalb reichen die Texte
von einem Satz bis an den Kontext-Deckel (``MAX_SCENE_DESC_CHARS``) — und nicht weiter,
damit Echo jede Szene ganz sieht.

*Material, das nicht in eine Richtung zeigt.* Lena schildert auch die drei Tage, in denen
Marco der Mensch war, in den sie sich verliebt hat (Szene 9), und den Abend, an dem sie
selbst mit Trennung gedroht hat (Szene 15). Ohne Gegenbelege gäbe es in der Fall-FAQ nichts
gegen den Strich zu lesen — und die wichtigste Frage des Katalogs („Was spricht dagegen?")
bliebe leer.

*Zwei Sichten, die sich berühren.* Dieselben Abende tragen in beiden Fällen dasselbe Datum.
Die Fakten decken sich oft bis ins Detail (der Schlüssel am falschen Bund, der Mantel, der
nach Popcorn roch), die Bedeutung fast nie. Genau das soll die Paar-Analyse nebeneinander
legen können.

**Musterklassen** stehen so an den Szenen, wie der Label-Leitfaden es verlangt: gelabelt
wird, was im Text steht, und die Richtung spielt keine Rolle — Marcos eigene ``Kontrolle``
heißt genauso wie die, die Lena erlebt. Etliche Szenen tragen bewusst keine Klasse.

**Das hier ist die einzige Quelle.** Die Migration ``zz_111_beispielfaelle.sql`` wird aus
dieser Datei erzeugt (``python -m app.services.demo_migration``), die Fall-FAQ in
``demo_fall_faq.py`` zitiert wörtlich aus diesen Texten, und die Tests halten beides fest.
Alles erfunden; Ähnlichkeiten mit echten Menschen wären Zufall.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Szene:
    nr: int
    datum: str
    titel: str
    text: str
    reaktion: str
    belastung: int
    muster: tuple[str, ...] = ()
    #: ``freetext`` | ``guided`` | ``chat`` — wie die Szene entstanden ist.
    eingabe: str = "freetext"
    sicherheit: str = "none"


@dataclass(frozen=True)
class Fragebogen:
    beziehung: str
    typische_szenen: str
    hauptbelastung: str
    praegendes_ereignis: str
    erinnerliche_szenen: str
    #: 1–10, wie im Fragebogen der App.
    belastung: int
    sicherheit: str
    person_name: str
    #: (Bezeichnung, Sicherheit) — die Muster, die die Person selbst vermutet.
    vermutungen: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class Skala:
    schluessel: str
    wert: int
    sicherheit: str
    szenen: tuple[int, ...]
    notiz: str


@dataclass(frozen=True)
class Fall:
    anliegen: str
    fragebogen: Fragebogen
    szenen: tuple[Szene, ...]
    skalen: tuple[Skala, ...]
    themen: dict[str, str] = field(default_factory=dict)
    hypothesen: dict[str, str] = field(default_factory=dict)


# ═════════════════════════════════════════════════════════════════════════════
# Lena
# ═════════════════════════════════════════════════════════════════════════════

_LENA_SZENEN = (
    Szene(
        1, "2023-09-16", "Jeden Morgen um sechs eine Nachricht",
        "Kennengelernt haben wir uns Ende August auf Miras Geburtstag, im Garten ihrer "
        "Eltern. Er hat den ganzen Abend nur mit mir geredet. Am nächsten Morgen um sechs "
        "kam die erste Nachricht: „Bist du schon wach? Ich seit vier. Wegen dir.“\n\n"
        "Seitdem jeden Morgen um sechs. Manchmal ein Foto vom Sonnenaufgang, manchmal nur "
        "ein Satz. Nach drei Wochen hat er gesagt, er habe noch nie jemanden getroffen, der "
        "ihn so versteht, wir seien Seelenverwandte. Letzte Woche hat er mir Wohnungsanzeigen "
        "geschickt, halb im Spaß. Heute hat er gefragt, ob ich Weihnachten seine Mutter "
        "kennenlernen will.\n\n"
        "Ich habe Ja gesagt. Es ist schön. Es ist nur alles so schnell, und wenn ich das "
        "Mira gegenüber sage, klinge ich undankbar.",
        "Verliebt wie mit zwanzig. Und ein bisschen außer Atem, als würde ich hinterherlaufen, "
        "obwohl es doch um mich geht.",
        1, ("Idealisierung",),
    ),
    Szene(
        2, "2023-11-04", "Peinlich naiv",
        "Abendessen mit meinem Team, zum ersten Mal mit Marco. Ich habe von dem Projekt in "
        "Leipzig erzählt, auf das ich wirklich stolz bin. Er hat mich zweimal verbessert, "
        "einmal bei einer Zahl, einmal bei der Reihenfolge, beide Male freundlich lachend.\n\n"
        "Im Auto hat er erst nichts gesagt. An der Ampel dann: „Das war peinlich naiv, wie du "
        "das erzählt hast. Die haben doch gemerkt, dass du nicht weißt, wovon du redest.“\n\n"
        "Ich habe mich entschuldigt. Wofür genau, wusste ich nicht.",
        "Beschämt. Ich habe die halbe Nacht jedes Gespräch im Kopf nachgespielt und die "
        "Stelle gesucht, an der ich mich blamiert habe. Ich habe keine gefunden.",
        3, ("Abwertung", "Anpassung"), "guided",
    ),
    Szene(
        3, "2023-12-10", "Die Nachricht, die es beweist",
        "Gestern war Papas Siebzigster. Marco hatte vor Wochen zugesagt mitzukommen. Am "
        "Freitagabend hat er gesagt, davon sei nie die Rede gewesen, das Wochenende sei "
        "längst verplant. „Du denkst dir Sachen aus, Lena. Das machst du öfter.“\n\n"
        "Ich bin allein gefahren. Meine Mutter hat dreimal gefragt, wo er ist.\n\n"
        "Nachts im Gästezimmer habe ich angefangen, im Handy zurückzuscrollen, weil ich mir "
        "selbst nicht mehr sicher war. Um halb zwei habe ich sie gefunden, vom 2. November: "
        "„Klar komme ich mit, ich freu mich auf deinen Vater!“\n\n"
        "Heute habe ich ihm den Screenshot gezeigt. Er hat kurz draufgesehen und gesagt: "
        "„Dann habe ich mich missverständlich ausgedrückt. Können wir jetzt bitte über was "
        "anderes reden?“",
        "Erleichtert, dass es die Nachricht gibt. Und erschrocken darüber, dass ich eine "
        "Nachricht brauchte, um mir selbst zu glauben.",
        4, ("Wahrnehmungsverunsicherung", "Rechtfertigung/Abwehr", "Wortbruch"), "guided",
    ),
    Szene(
        4, "2024-01-18", "Mira nicht erwähnt",
        "Heute mit Mira im Kino. Marco habe ich gesagt, ich sei länger im Büro. Seit er "
        "sagt, dass sie mich runterzieht, ist es so einfach leichter.",
        "Schlechtes Gewissen, als hätte ich etwas Verbotenes getan. Dabei war es nur Kino.",
        2, ("Isolation", "Anpassung"),
    ),
    Szene(
        5, "2024-03-02", "Wofür brauchst du den?",
        "Seit Februar wohne ich bei Marco. Das gemeinsame Konto war seine Idee, „der "
        "Einfachheit halber“. Alle Fixkosten laufen darüber, und ich zahle mehr ein, weil ich "
        "mehr verdiene.\n\n"
        "Heute kam ich mit einem Mantel nach Hause, 280 Euro im Schlussverkauf. Er hatte die "
        "Abbuchung schon in der App gesehen, bevor ich die Tüte abgestellt hatte. „Wofür "
        "brauchst du den? Du hast doch einen.“ Dann wollte er den Kassenbon sehen.\n\n"
        "Vor zwei Wochen hat er sich ein Rennrad für 2.400 Euro gekauft, vom gemeinsamen "
        "Konto. Darüber haben wir nicht gesprochen. Ich habe es an der Abbuchung gesehen.",
        "Ich habe den Bon gesucht und mich dabei gefühlt wie mit vierzehn. Ich verdiene mehr "
        "als er und muss mich trotzdem erklären.",
        3, ("Kontrolle",), "guided",
    ),
    Szene(
        6, "2024-04-12", "Mein Geburtstag",
        "Für heute Abend hatte ich beim Italiener an der Ecke einen Tisch für acht "
        "reserviert: Mira, Katrin, zwei Kolleginnen, ihre Männer, Marco und ich. Seit Wochen "
        "geplant, Marco wusste davon.\n\n"
        "Beim Frühstück hat er mir einen Umschlag gegeben: eine Nacht in einem Wellnesshotel "
        "an der Seenplatte, heute, Abfahrt um vier. Ich habe mich gefreut und gefragt, ob wir "
        "morgen fahren können, heute sei doch der Italiener. Er hat den Umschlag wieder "
        "eingesteckt.\n\n"
        "Um halb drei schrieb Mira: „Oh nein, gute Besserung, Süße! Wir holen das nach 💐“. "
        "In der Gruppe, in die ich Marco zum Planen aufgenommen hatte, stand von ihm, "
        "13:12 Uhr: „Lena hat sich was eingefangen, wir müssen heute leider absagen.“\n\n"
        "Ich habe ihn gefragt, was das soll. Er hat gesagt, er habe wochenlang etwas "
        "Besonderes geplant und ich hätte es ihm vor die Füße geworfen. „Ich wollte dich "
        "überraschen, und du bist einfach nur undankbar.“ Irgendwann hat er geweint.\n\n"
        "Den Freundinnen habe ich nicht geschrieben, dass es nicht stimmt. Ich wusste nicht, "
        "wie, ohne ihn bloßzustellen. Katrin hat angerufen und gefragt, ob sie mir Suppe "
        "vorbeibringen soll. Ich habe gesagt, es gehe schon. Um vier sind wir gefahren.\n\n"
        "Im Hotel war er zärtlich, hat Champagner bestellt und gesagt, dass er sich keinen "
        "besseren Menschen vorstellen kann. Ich lag nachts wach und habe mich gefragt, ob "
        "ich wirklich undankbar bin.",
        "Wut, und sofort danach der Zweifel, ob ich überreagiere. Am nächsten Morgen habe "
        "ich mich für den Streit entschuldigt.",
        4, ("Schuldumkehr", "Isolation", "Anpassung"),
    ),
    Szene(
        7, "2024-04-23", "Tag neun",
        "Tag neun, seit ich gesagt habe, dass es nicht in Ordnung war, meinen Freundinnen zu "
        "schreiben, ich sei krank. Er sagt dem Kater Guten Morgen, mir nicht. Heute habe ich "
        "zum dritten Mal gefragt, ob wir reden können. Er hat den Fernseher lauter gemacht.",
        "Ich schlafe kaum. Ich würde fast alles tun, damit es aufhört.",
        5, ("Schweigen/Rückzug",),
    ),
    Szene(
        8, "2024-04-28", "Das Wochenende an der Ostsee",
        "Am Freitag, Tag vierzehn, stand er mit einem riesigen Strauß Ranunkeln in der Küche, "
        "meinen Lieblingsblumen. Er hat geweint und gesagt, er sei ein Idiot, er könne ohne "
        "mich nicht leben, ich sei das Beste, was ihm je passiert ist. Die Taschen waren "
        "schon gepackt: zwei Nächte Warnemünde.\n\n"
        "Es war wunderschön. Wir sind stundenlang am Strand gelaufen, er hat meine Hand nicht "
        "losgelassen. Am Samstagabend habe ich vorsichtig angefangen, über den Geburtstag und "
        "die zwei Wochen zu reden. Er hat mich geküsst und gesagt: „Lass uns das Wochenende "
        "nicht kaputtmachen.“\n\n"
        "Wir haben nie wieder darüber gesprochen. Mira und die anderen glauben bis heute, ich "
        "war an meinem Geburtstag krank.",
        "Erleichterung, so groß, dass sie wehtat. Und ganz leise: schon wieder.",
        3, ("Reparatur bleibt aus", "Idealisierung"), "guided",
    ),
    Szene(
        9, "2024-06-01", "Als Papa im Krankenhaus lag",
        "Samstagnacht um zwei hat meine Mutter angerufen: Papa hatte einen Herzinfarkt, sie "
        "waren schon in der Klinik. Ich konnte nicht fahren, meine Hände haben so gezittert.\n\n"
        "Marco hat nicht gefragt, sondern die Schlüssel genommen. Er ist dreieinhalb Stunden "
        "durchgefahren und hat mir unterwegs immer wieder die Hand aufs Knie gelegt. In der "
        "Klinik hat er mit der Ärztin gesprochen, als ich nichts mehr verstanden habe, und mir "
        "hinterher alles in Ruhe erklärt. Er hat drei Nächte im Auto auf dem Parkplatz "
        "geschlafen, weil bei meiner Mutter kein Platz war, und morgens Brötchen für uns alle "
        "geholt. Meine Mutter hat gesagt: „Den behältst du.“\n\n"
        "Ich schreibe das auf, weil es auch stimmt. In diesen drei Tagen war er genau der "
        "Mensch, in den ich mich verliebt habe. Papa geht es inzwischen besser.",
        "Unendlich dankbar. Und durcheinander, weil das nicht zu dem anderen passt, das ich "
        "hier aufschreibe. Vielleicht übertreibe ich das andere doch.",
        4, ("Zugewandtheit",),
    ),
    Szene(
        10, "2024-07-14", "Zu empfindlich",
        "Er kneift mir beim Umziehen in den Bauch: „Na, fürs Freibad reicht's noch nicht.“ "
        "Ich sage, dass mich das trifft. „Das war ein Witz. Du bist echt zu empfindlich.“",
        "Den Satz höre ich inzwischen jede Woche.",
        3, ("Wahrnehmungsverunsicherung", "Abwertung"),
    ),
    Szene(
        11, "2024-08-18", "Was hast du zu verbergen?",
        "Als ich aus der Dusche kam, saß Marco auf dem Bett, mein Handy in der Hand. Er hatte "
        "meinen Chat mit Jonas gelesen, meinem Kollegen aus dem Leipzig-Projekt. Da stand "
        "„Du bist die Beste 🙂“, weil ich für ihn eine Präsentation fertig gemacht hatte, als "
        "seine Tochter krank war.\n\n"
        "Ich habe gesagt, dass er nicht einfach mein Handy lesen kann. Er hat geantwortet: "
        "„Wer nichts zu verbergen hat, hat damit auch kein Problem. Was hast du zu "
        "verbergen?“ Danach ging es eine Stunde nur noch darum, warum ich so empfindlich "
        "reagiere, wenn doch nichts ist.\n\n"
        "Am Ende habe ich ihm meinen Code gegeben. Ich wollte, dass Ruhe ist.",
        "Überwacht und gleichzeitig die Verdächtige. Seitdem schreibe ich Jonas nur noch das "
        "Nötigste.",
        4, ("Schuldumkehr", "Kontrolle", "Anpassung"), "chat",
    ),
    Szene(
        12, "2024-09-28", "Die Geschichte mit dem Parkhaus",
        "Tobis Vierzigster, ungefähr dreißig Leute, die meisten kenne ich nur über Marco. "
        "Nach dem Essen hat er erzählt, wie ich im Juli an einer Parkhausschranke hängen "
        "geblieben bin, weil das Ticket nicht ging, und ihn weinend angerufen habe, während "
        "hinter mir alle gehupt haben.\n\n"
        "Er hat meine Stimme nachgemacht, hoch und weinerlich: „Marco, die hupen alle!“ Dann "
        "hat er vorgeführt, wie ich mich mit beiden Händen ans Lenkrad klammere. Alle haben "
        "gelacht. Ich habe mitgelacht, weil alle mich angesehen haben.\n\n"
        "Was er nicht erzählt hat: Es war der Tag, an dem mich meine Hausärztin wegen der "
        "Schlafprobleme krankschreiben wollte. Es lag nicht am Ticket. Ich konnte einfach "
        "nicht mehr.\n\n"
        "Im Auto habe ich gesagt, dass mich das verletzt hat. „Alle haben gelacht. Du auch. "
        "Jetzt tu nicht so, als wäre das schlimm gewesen.“ Und dann: „Mit dir kann man echt "
        "keinen Spaß mehr haben.“",
        "Gedemütigt. Und allein damit, weil ich ja mitgelacht habe. Ich habe mich gefragt, ob "
        "ich die Einzige war, die es nicht lustig fand.",
        4, ("Wahrnehmungsverunsicherung", "Verachtung"),
    ),
    Szene(
        13, "2024-10-20", "Am Schlüssel hören",
        "Mir fällt auf, dass ich am Geräusch des Schlüssels in der Tür höre, wie Marcos Laune "
        "ist. Danach entscheide ich, was ich koche.",
        "Erschrocken, wie normal mir das vorkam.",
        3,
    ),
    Szene(
        14, "2024-11-10", "Paarberatung? Du vielleicht.",
        "Nach dem Abendessen habe ich ihm den Flyer einer Paarberatungsstelle hingelegt und "
        "gesagt, dass ich nicht mehr weiterweiß und uns nicht aufgeben will.\n\n"
        "Er hat ihn nicht angefasst. „Mit dir und deinen Problemen müsste man da hin, nicht "
        "mit mir.“ Und nach einer Pause: „Geh du ruhig. Dann erzählst du denen wenigstens "
        "nicht, dass alles an mir liegt.“",
        "Mutlos. Sogar der Versuch, Hilfe zu holen, ist mein Fehler geworden. Den Flyer habe "
        "ich am nächsten Tag im Altpapier gefunden.",
        3, ("Schuldumkehr", "Abwertung"), "guided",
    ),
    Szene(
        15, "2025-02-02", "Ich habe es gesagt",
        "Mira wollte am Wochenende vorbeikommen, und Marco hat gesagt, dann sei er eben weg, "
        "„mit deiner Seelsorgerin setze ich mich nicht an einen Tisch“. Da ist es mir "
        "herausgerutscht, so ruhig wie noch nie: „Wenn das so weitergeht, gehe ich.“\n\n"
        "Ich habe gesehen, wie ihm alles aus dem Gesicht gefallen ist. Er hat angefangen zu "
        "weinen, richtig, wie ein Kind. Er hat sich in der Küche auf den Boden gesetzt und "
        "gesagt, dass er alles ändert und dass ich das nicht machen darf.\n\n"
        "Ich muss ehrlich sein: Für einen Moment habe ich mich stark gefühlt. Zum ersten Mal "
        "seit Langem hatte ich etwas in der Hand. Danach habe ich mich geschämt. Das war nicht "
        "fair, auch wenn ich es ernst meinte.\n\n"
        "Ich habe den Satz seit dem Sommer schon zweimal gesagt, nur leiser. Ich merke, dass "
        "ich ihn benutze.",
        "Erleichtert, dass er zuhört, und beschämt, weil er erst zuhört, wenn ich drohe. Ich "
        "weiß, dass ich damit auch Druck mache.",
        4, ("Drohung",),
    ),
    Szene(
        16, "2025-05-18", "Seit Februar wie ausgewechselt",
        "Seit dem Abend im Februar ist Marco wie ausgewechselt. Er fragt jeden Abend, wie mein "
        "Tag war, und hört sich die Antwort an. Er kocht. Letzten Sonntag hat er Mira zum "
        "Essen eingeladen und war den ganzen Abend charmant. Mira hat mir hinterher "
        "geschrieben: „Wer ist das, und was hast du mit Marco gemacht?“\n\n"
        "Für den Herbst hat er Lissabon vorgeschlagen, nur wir zwei.\n\n"
        "Ich müsste glücklich sein. Stattdessen warte ich die ganze Zeit darauf, dass es "
        "kippt. Wenn er nach Hause kommt, atme ich erst aus, wenn ich seine Stimme gehört habe. "
        "Und ich schäme mich, weil ich ihm nicht glauben kann, obwohl er sich so bemüht.",
        "Hoffnung und Misstrauen gleichzeitig. Ich komme mir undankbar vor, schon wieder "
        "dieses Wort.",
        2, ("Zugewandtheit",), "guided",
    ),
    Szene(
        17, "2025-09-19", "Zurück aus Hamburg",
        "Drei Tage Hamburg, meine erste Dienstreise als Abteilungsleiterin. Ich war so stolz. "
        "Als ich die Tür aufgeschlossen habe, saß er auf dem Sofa und hat nicht aufgesehen: "
        "„Na, wie war's mit deinen wichtigen Leuten?“\n\n"
        "Danach zwei Tage kaum ein Wort. Lissabon hat er nicht mehr erwähnt.\n\n"
        "Das Seltsame: Ich war fast erleichtert. Da war sie wieder, die alte Stimme, und ich "
        "habe gedacht: Siehst du. Ich habe es mir nicht eingebildet.",
        "Traurig und seltsam klar. Die guten Monate waren echt, und sie waren trotzdem kein "
        "Neuanfang.",
        4, ("Verachtung", "Schweigen/Rückzug"),
    ),
    Szene(
        18, "2025-12-24", "Heiligabend vor der Tür",
        "Wir waren bei seiner Mutter. Gegen neun habe ich Papa angerufen, seit dem Infarkt "
        "telefonieren wir an Feiertagen immer lange. Wir haben vielleicht vierzig Minuten "
        "gesprochen. Als ich zurück ins Wohnzimmer kam, war die Stimmung "
        "eisig.\n\n"
        "Im Auto hat er gesagt: „Dann feier doch nächstes Jahr mit deinem Vater.“ Ich habe "
        "gesagt, dass das unfair ist. Mehr nicht, ich war nicht laut.\n\n"
        "Vor unserem Haus hat er angehalten und gesagt, er suche noch einen Parkplatz. Er ist "
        "weggefahren. Erst an der Haustür habe ich gemerkt, dass mein Schlüssel an seinem Bund "
        "hing. Ich hatte ihn ihm nachmittags gegeben, weil meine Tasche voller Geschenke war.\n\n"
        "Ich habe ihn angerufen. Elfmal. Eine Nachbarin hat mich ins Treppenhaus gelassen, und "
        "ich habe auf der Treppe vor unserer Wohnung gesessen, im Mantel, mit acht Prozent "
        "Akku, und durch die Tür den Kater gehört. Die Nachbarin hat gefragt, ob alles in "
        "Ordnung ist. Ich habe gesagt, mein Freund sucht nur einen Parkplatz. Später hat sie "
        "mir wortlos einen Teller Plätzchen auf die Stufe gestellt.\n\n"
        "Um zwanzig vor eins kam er die Treppe hoch, er war bei Tobi. „Du hättest ja bei den "
        "Nachbarn klingeln können. Musst du immer so ein Drama machen?“\n\n"
        "Am ersten Feiertag hat er Frühstück gemacht, mit Kerzen. Über die Nacht hat er kein "
        "Wort verloren. Ich auch nicht.",
        "Erschöpft und seltsam klar. Zum ersten Mal eher traurig als schuldig. Auf der Treppe "
        "habe ich etwas begriffen, das ich noch nicht aufschreiben kann.",
        5, ("Schuldumkehr", "Schweigen/Rückzug", "Reparatur bleibt aus"),
    ),
    Szene(
        19, "2026-01-11", "Katrin alles erzählt",
        "Ich war übers Wochenende bei meiner Schwester und habe ihr zum ersten Mal alles "
        "erzählt. Nicht die Kurzfassung, sondern alles: den Geburtstag, die zwei Wochen, das "
        "Handy, Heiligabend.\n\n"
        "Katrin hat nichts gesagt, bis ich fertig war. Dann hat sie geweint. Dann hat sie "
        "gesagt: „Du entschuldigst dich seit zwei Jahren für Dinge, die er macht. Weißt du "
        "das eigentlich?“\n\n"
        "Ich wusste es nicht. Oder ich wusste es und habe es nicht gehört, solange es nur in "
        "meinem Kopf war. Wir haben bis drei Uhr nachts geredet. Sie hat gesagt, ich kann "
        "jederzeit bei ihr wohnen.",
        "Scham, weil ich so viel verschwiegen habe. Und darunter zum ersten Mal Entlastung: "
        "Jemand hat alles gehört und hält mich nicht für verrückt.",
        2, (), "guided",
    ),
    Szene(
        20, "2026-02-22", "Der Sonntag, an dem ich gegangen bin",
        "Ich hatte es mit Katrin vorbereitet. Die wichtigsten Sachen waren schon bei ihr, sie "
        "hat unten im Auto gewartet. Ich wollte es ruhig sagen, am Tisch, bei Tageslicht, "
        "nicht im Streit: „Ich beende unsere Beziehung. Ich ziehe heute zu Katrin.“\n\n"
        "In der nächsten Stunde war er drei verschiedene Menschen. Erst hat er geweint und "
        "gefleht: Ich sei der einzige Mensch, der ihn je wirklich gesehen hat, er mache eine "
        "Therapie, alles, was ich will. Als ich bei meinem Nein geblieben bin, wurde er laut: "
        "„Nach allem, was ich für dich getan habe. Ich habe für deinen Vater drei Nächte im "
        "Auto geschlafen.“ Und am Ende ganz ruhig: „Ohne mich schaffst du das nicht. Du hast "
        "doch niemanden mehr.“\n\n"
        "Als ich meine Jacke genommen habe, hat er sich vor die Wohnungstür gestellt. „Wir "
        "reden jetzt zu Ende.“ Vielleicht eine Minute, er hat mich nicht angefasst. Dann hat "
        "Katrin angerufen, weil es so lange dauerte, und er ist zur Seite gegangen.\n\n"
        "Auf der Treppe musste ich mich am Geländer festhalten. Im Auto hat Katrin nichts "
        "gefragt, nur meine Hand gehalten.\n\n"
        "Bis Mitternacht kamen dreiundzwanzig Nachrichten. Die ersten waren lang und "
        "liebevoll. Die letzte: „Du wirst das bereuen.“",
        "Zitternd, entschlossen, voller Angst und voller Erleichterung, den ganzen Tag beides "
        "gleichzeitig. Die Minute an der Tür träume ich seitdem öfter.",
        4, ("Schuldumkehr", "Abwertung", "Übergriffigkeit", "Drohung", "Idealisierung"),
        sicherheit="elevated",
    ),
    Szene(
        21, "2026-03-17", "Dienstagabend, 23:14 Uhr",
        "Dreieinhalb Wochen nach der Trennung kam um 23:14 Uhr eine lange Nachricht. Er habe "
        "viel nachgedacht, er habe einen Termin bei einem Therapeuten, er verstehe jetzt, was "
        "er mir angetan habe. Ich sei die Liebe seines Lebens, er bitte nur um ein Gespräch.\n\n"
        "Ich habe bis zwei Uhr Antworten geschrieben und wieder gelöscht.\n\n"
        "Um 7:02 Uhr kam die nächste Nachricht: „Die 1.200 Euro für die Küche überweist du "
        "bitte bis Freitag. Das ist ja wohl das Mindeste.“",
        "Wütend auf mich, weil ich um zwei Uhr fast zurückgeschrieben hätte. Um 7:02 Uhr war "
        "ich dann wieder wach.",
        3, ("Idealisierung",), "chat",
    ),
    Szene(
        22, "2026-04-19", "Was die anderen jetzt über mich hören",
        "Über Tobis Frau habe ich erfahren, was Marco erzählt: dass ich ihn mit einem Kollegen "
        "betrogen hätte und gegangen sei, als es ihm schlecht ging. Er nennt Jonas beim "
        "Namen.\n\n"
        "Zwei Paare aus dem gemeinsamen Freundeskreis melden sich seitdem nicht mehr. Eine "
        "alte Freundin schreibt, sie wolle sich da raushalten.\n\n"
        "Ich habe lange Erklärungen an Leute geschrieben, die mich nicht gefragt haben. "
        "Abgeschickt habe ich keine.",
        "Ohnmächtig gegen ein Bild, das ich nicht geraderücken kann, ohne selbst über ihn "
        "herzuziehen.",
        4, ("Isolation",), "guided",
    ),
    Szene(
        23, "2026-05-13", "Drei Anläufe für eine sachliche Mail",
        "Das gemeinsame Konto ist immer noch nicht aufgelöst. Die Bank braucht beide "
        "Unterschriften, und Marco hat seit sechs Wochen jeden Termin verschoben, zweimal eine "
        "Stunde vorher.\n\n"
        "Seine letzte Mail: „Ich unterschreibe, wenn du endlich zugibst, dass du drei Jahre von "
        "meinem Geld gelebt hast.“ Wir waren keine drei Jahre zusammen, und ich habe mehr "
        "eingezahlt als er. Das steht in den Auszügen.\n\n"
        "Für eine Antwort von vier Sätzen habe ich drei Anläufe gebraucht. Die ersten beiden "
        "haben alles erklärt. Katrin hat sie gelesen und gesagt: „Du verteidigst dich schon "
        "wieder.“ Die dritte hatte nur noch den Terminvorschlag.",
        "Angespannt. Jeder Kontakt zieht mich kurz zurück ins alte Muster. Aber die dritte "
        "Mail war meine.",
        3, ("Kontrolle", "Drohung"), "guided",
    ),
    Szene(
        24, "2026-06-06", "Ein Samstag mit Mira",
        "Mit Mira auf dem Flohmarkt am Kanal, zum ersten Mal seit über einem Jahr einfach so, "
        "ohne vorher zu überlegen, was ich zu Hause sage. Wir haben über eine hässliche Vase "
        "so gelacht, dass die Leute geguckt haben.\n\n"
        "Ich habe ihr gesagt, dass es mir leidtut, das mit meinem Geburtstag, dass ich gar "
        "nicht krank war. Sie hat gesagt: „Das weiß ich doch längst.“\n\n"
        "Abends ist mir aufgefallen, dass ich den ganzen Tag nicht aufs Handy geschaut habe.",
        "Leicht. So kann es sich also anfühlen.",
        1,
    ),
    Szene(
        25, "2026-07-02", "Eine Nachricht wegen der Winterjacke",
        "Eine einzige Nachricht von Marco, ohne Gruß: „Deine Winterjacke hängt noch hier. Hol "
        "sie bis Sonntag, sonst kommt sie weg.“\n\n"
        "Das hat für zwei Tage gereicht. Ich habe schlecht geschlafen, bei der Arbeit dreimal "
        "denselben Absatz gelesen und mich gefragt, ob ich nicht doch die ganze Zeit "
        "überempfindlich war. Ob ich das Problem war.\n\n"
        "Am zweiten Abend habe ich Katrin angerufen. Wir haben zehn Minuten geredet, fast nur "
        "über anderes. Danach habe ich geantwortet: „Ich hole sie Samstag um elf. Leg sie "
        "bitte in den Flur.“ Ein Satz, ohne Erklärung.",
        "Frustriert, dass eine Nachricht noch so viel Macht hat. Und ein bisschen stolz auf "
        "den einen Satz.",
        3,
    ),
)

LENA = Fall(
    anliegen=(
        "Nach der Trennung verstehen, was in diesen zweieinhalb Jahren passiert ist, und "
        "wieder meiner eigenen Wahrnehmung trauen."
    ),
    fragebogen=Fragebogen(
        beziehung=(
            "Zweieinhalb Jahre mit Marco, davon zwei Jahre in seiner Wohnung. Am Anfang "
            "überwältigend, er hat mich auf Händen getragen. Später immer öfter abwertend und "
            "kontrollierend, dazwischen Phasen, in denen er wunderbar war. Seit vier Monaten "
            "getrennt, über das gemeinsame Konto und den Freundeskreis noch in Kontakt."
        ),
        typische_szenen=(
            "Wenn ich etwas Eigenes mache, mit Freundinnen, bei der Arbeit, an meinem "
            "Geburtstag, kommt eine Spitze oder er redet tagelang nicht mit mir. Am Ende "
            "entschuldige ich mich, und über das Eigentliche wird nie gesprochen."
        ),
        hauptbelastung=(
            "Ich traue meiner eigenen Wahrnehmung nicht mehr und brauche Beweise, um mir selbst "
            "zu glauben. Dazu der Kontaktverlust zu Freundinnen und der Schlaf."
        ),
        praegendes_ereignis=(
            "Mein Geburtstag. Er hat meinen Freundinnen hinter meinem Rücken geschrieben, ich "
            "sei krank, damit wir in sein Hotel fahren. Als ich es angesprochen habe, hat er "
            "zwei Wochen nicht mit mir geredet, und danach kam ein Wochenende an der Ostsee, als "
            "wäre nichts gewesen."
        ),
        erinnerliche_szenen=(
            "Die Nachrichten jeden Morgen um sechs am Anfang. Heiligabend auf der Treppe vor "
            "der verschlossenen Tür. Und die drei Tage, als mein Vater im Krankenhaus lag. Da "
            "war er wunderbar, und das macht es so schwer."
        ),
        belastung=8,
        sicherheit="elevated",
        person_name="Marco",
        vermutungen=(
            ("Schuldumkehr nach Konflikten", "high"),
            ("Wechsel von Idealisierung und Abwertung", "high"),
            ("Kontrolle über Geld und Kontakte", "medium"),
        ),
    ),
    szenen=_LENA_SZENEN,
    skalen=(
        Skala("guilt_shifting", 84, "high", (6, 11, 14, 18, 19, 20),
              "Konflikte kippen regelhaft in einen Vorwurf an Lena; sie entschuldigt sich am "
              "Ende selbst (Szenen 6, 19)."),
        Skala("perception_distortion", 78, "high", (3, 10, 11, 12),
              "Erinnerung und Empfinden werden wiederholt für falsch erklärt; Lena sucht "
              "Belege, um sich selbst zu glauben (Szene 3)."),
        Skala("control_isolation", 74, "high", (4, 5, 6, 11, 22, 23),
              "Kontrolle über Konto und Handy, Absage des Geburtstags über ihren Kopf hinweg; "
              "nach der Trennung Rückzug gemeinsamer Freunde."),
        Skala("proximity_distance", 72, "medium", (1, 7, 8, 16, 17, 21),
              "Wechsel aus überschießender Zuwendung und wochenlangem Schweigen, zuletzt als "
              "Nachricht um 23:14 und 7:02 Uhr."),
        Skala("boundary_violation", 70, "medium", (5, 6, 10, 11, 12, 20),
              "Handy gelesen, Code eingefordert, Spott vor Dritten, beim Auszug die Tür "
              "versperrt. Keine Berührung, keine Gewalt geschildert."),
        Skala("conflict_escalation", 38, "low", (18, 20),
              "Wenig offene Eskalation: Konflikte enden eher im Schweigen als im Streit."),
        Skala("safety_risk", 36, "medium", (20, 23),
              "Keine körperliche Gewalt. Beim Auszug eine Minute der Weg versperrt, danach "
              "eine Drohung und Druck über das Konto. Im Erstgespräch ansprechen."),
    ),
    themen={
        "topic_self": (
            "Lena beschreibt sich als leistungsfähig, empathisch und lange sehr nachgiebig. "
            "Sie hat gelernt, ihrer Wahrnehmung zu misstrauen, und beobachtet an sich "
            "Wachsamkeit („am Schlüssel hören“) und Schlafprobleme. Seit der Trennung kehren "
            "Ressourcen zurück: die Schwester, die beste Freundin, kurze klare Antworten."
        ),
        "topic_person": (
            "Marco erscheint in ihren Szenen charmant, fürsorglich in der Krise und "
            "zugleich abwertend, kontrollierend und schnell gekränkt, vor allem wenn Lena "
            "eigene Wege geht. Auffällig sind Schuldumkehr, Schweigen als Reaktion auf Kritik "
            "und große Gesten, die ein Gespräch ersetzen."
        ),
        "topic_responsibility": (
            "Lena benennt eigene Anteile: dass sie sich vorschnell entschuldigt, Treffen "
            "verschwiegen und mehrfach mit Trennung gedroht hat. Die Aufgabe ist, diese "
            "Anteile ernst zu nehmen, ohne sie gegen Marcos Verhalten aufzurechnen."
        ),
        "topic_guilt": (
            "Schuldgefühle tauchen vor allem nach Kontakt mit Marco auf und wirken eher durch "
            "Druck erzeugt als durch eigenes Fehlverhalten begründet. Wiederkehrendes Wort: "
            "„undankbar“."
        ),
    },
    hypothesen={
        "hyp_dynamics": (
            "Wiederkehrender Ablauf: Lena bewegt sich eigenständig (Freundin, Geburtstag, "
            "Beförderung) → Spitze oder Schweigen → Lena entschuldigt sich → große Geste ohne "
            "Klärung. Nach ihrer Trennungsdrohung eine monatelange Phase echter Zuwendung, die "
            "beim nächsten Autonomieschritt endet (Szenen 15–17)."
        ),
        "hyp_clusterb": (
            "Im Fremdbericht mehrere narzisstisch anmutende Anhaltspunkte bei Marco "
            "(Kränkbarkeit bei Eigenständigkeit, Herabsetzung vor Dritten, Schuldumkehr). "
            "Deutliche Gegenbelege: verlässliche Fürsorge in der Krise (Szene 9), monatelange "
            "Zuwendung (Szene 16). Einseitige Quelle, ausdrücklich keine Diagnose."
        ),
        "hyp_attachment": (
            "Bei Lena Hinweise auf ängstliche Bindungsanteile: Schweigephasen lösen "
            "Verzweiflung und Einlenken aus (Szene 7), gute Phasen werden misstrauisch "
            "überwacht (Szene 16). Das verstärkt den Sog des Nähe-Distanz-Wechsels."
        ),
        "hyp_trauma": (
            "Zeichen kumulativer Belastung: Hypervigilanz (Szene 13), Schlafstörung "
            "(Szenen 7, 12), Grübeln nach kleinsten Kontakten (Szene 25). Stabilisierung und "
            "Psychoedukation vor jeder Konfrontation."
        ),
        "hyp_own_role": (
            "Lenas Anteil liegt in früh übergangenen eigenen Grenzen, vorauseilender Anpassung "
            "und der Trennungsdrohung als Hebel (Szene 15). Als verständliche Schutzstrategien "
            "zu würdigen, nicht als Schuld."
        ),
    },
)


# ═════════════════════════════════════════════════════════════════════════════
# Marco
# ═════════════════════════════════════════════════════════════════════════════

_MARCO_SZENEN = (
    Szene(
        1, "2023-09-16", "Endlich jemand, der bleibt",
        "Ich habe Lena Ende August auf dem Geburtstag ihrer besten Freundin kennengelernt. "
        "Eigentlich wollte ich nach einer Stunde gehen, und dann war es drei Uhr morgens.\n\n"
        "Ich schreibe ihr jeden Morgen, bevor sie aufwacht. Ich will, dass das Erste, was sie "
        "am Tag sieht, von mir ist. Nach drei Wochen habe ich ihr gesagt, dass ich so etwas "
        "noch nie erlebt habe, und das stimmt.\n\n"
        "Mein Vater ist gegangen, als ich elf war. Er hat es zweimal angekündigt, beim dritten "
        "Mal war er weg, und meine Mutter hat ein Jahr lang abends in der Küche geweint. "
        "Seitdem war ich in jeder Beziehung der, der auf den Moment wartet, in dem die andere "
        "geht.\n\n"
        "Mit Lena ist das zum ersten Mal anders. Ich will keine Zeit verlieren.",
        "Glücklich. Zum ersten Mal seit Jahren nicht auf der Hut.",
        1, ("Idealisierung",),
    ),
    Szene(
        2, "2023-11-04", "Das Abendessen mit ihrem Team",
        "Essen mit Lenas Kollegen. Sie hat von ihrem Projekt in Leipzig erzählt und dabei "
        "Sachen durcheinandergebracht, eine Zahl war falsch. Ich habe es freundlich "
        "korrigiert, damit es keiner merkt.\n\n"
        "Im Auto habe ich gesagt, dass das ein bisschen peinlich war. Vielleicht zu direkt, "
        "das gebe ich zu. Aber ich will nicht, dass Leute über sie lachen, und ich bin nun mal "
        "ehrlich. Sie hat sich sofort entschuldigt und war den ganzen Abend beleidigt.",
        "Genervt. Wenn ich etwas Ehrliches sage, ist es gleich ein Angriff.",
        2, ("Abwertung", "Rechtfertigung/Abwehr"), "guided",
    ),
    Szene(
        3, "2024-01-18", "Mira",
        "Mira hat uns zusammengebracht, und seit wir zusammen sind, arbeitet sie daran, uns "
        "auseinanderzubringen. So kommt es mir jedenfalls vor.\n\n"
        "Jedes Mal, wenn Lena von ihr kommt, ist sie anders. Stiller, und sie stellt Fragen, "
        "die nicht von ihr sind: ob ich nicht ein bisschen viel wissen will, wo sie ist.\n\n"
        "Ich habe Lena gesagt, dass Mira sie runterzieht. Das ist meine Meinung, die darf ich "
        "sagen. Ich habe nie gesagt, dass sie sie nicht treffen soll.\n\n"
        "Heute war sie angeblich länger im Büro. Ihr Mantel roch nach Popcorn.",
        "Ausgeschlossen. Und eifersüchtig auf eine Freundschaft, was ich mir nicht gern "
        "eingestehe.",
        3, ("Isolation", "Rechtfertigung/Abwehr"),
    ),
    Szene(
        4, "2024-03-02", "Der Mantel",
        "Ich habe gefragt, wofür sie den Mantel braucht. Eine Frage. Für Lena war das gleich "
        "ein Verhör. Einer von uns muss aufs Geld achten, und sie kauft, wenn es ihr schlecht "
        "geht. Das Rennrad war etwas anderes, das brauche ich für meinen Rücken, das weiß sie.",
        "Missverstanden. Aus Vernunft wird bei ihr Kontrolle.",
        2, ("Kontrolle", "Rechtfertigung/Abwehr"), "guided",
    ),
    Szene(
        5, "2024-04-12", "Ihr Geburtstag",
        "Ich hatte seit Januar geplant. Ein Wellnesshotel an der Seenplatte, das Zimmer mit "
        "Blick aufs Wasser, 480 Euro, weil ich wollte, dass sie an ihrem Geburtstag einmal nur "
        "gefeiert wird und nicht selbst alles organisiert.\n\n"
        "Beim Frühstück habe ich ihr den Umschlag gegeben. Sie hat sich kurz gefreut und dann "
        "gefragt, ob wir nicht morgen fahren können, heute sei doch der Italiener mit ihren "
        "Leuten. Das hatte ich ehrlich gesagt verdrängt. In dem Moment kam ich mir vor wie "
        "eine Option unter mehreren.\n\n"
        "Ich habe in die Gruppe geschrieben, dass sie krank ist und wir absagen. Ich dachte, "
        "wenn der Abend frei ist, sieht sie, wie ernst ich es meine. Das war falsch, das weiß "
        "ich heute. Damals kam es mir wie eine Kleinigkeit vor, ihre Freundinnen sieht sie ja "
        "ständig.\n\n"
        "Als sie es gemerkt hat, hat sie mich angesehen, als hätte ich ihr etwas gestohlen. "
        "Ich habe gesagt, dass sie undankbar ist. Ich war so enttäuscht, dass ich geweint "
        "habe.\n\n"
        "Im Hotel war es dann schön. Finde ich. Wir haben gut gegessen, und ich habe ihr "
        "gesagt, wie viel sie mir bedeutet. Sie sagt heute, sie sei den ganzen Abend nicht da "
        "gewesen. Gemerkt habe ich davon nichts.",
        "Enttäuscht, dass meine Mühe nichts gezählt hat. Im Nachhinein beschämt über die "
        "Nachricht in der Gruppe.",
        3, ("Isolation", "Rechtfertigung/Abwehr"),
    ),
    Szene(
        6, "2024-04-16", "Ich konnte nicht reden",
        "Am Sonntag nach dem Geburtstag hat Lena wieder damit angefangen, dass ich ihre "
        "Freundinnen belogen habe. Da ging bei mir etwas zu. Ich habe tagelang kaum "
        "gesprochen.\n\n"
        "Mein Vater hat geschrien, wenn er wütend war, und hinterher Sachen gesagt, die man "
        "nicht zurücknehmen kann. Ich habe mir als Junge geschworen, dass ich nie so werde. "
        "Lieber still.\n\n"
        "Lena sagt, es waren zwei Wochen und ich hätte sie bestraft. Für mich waren es ein "
        "paar schlechte Tage, in denen ich Ruhe gebraucht habe. Ich habe mit dem Kater "
        "geredet, weil der wenigstens nichts von mir wollte.\n\n"
        "Irgendwann hat sie sich entschuldigt, und dann ging es wieder.",
        "Erschöpft und sprachlos. Ich wusste nicht, wie ich zurückkommen soll, ohne "
        "zuzugeben, dass die Nachricht in der Gruppe falsch war.",
        4, ("Schweigen/Rückzug",), "chat",
    ),
    Szene(
        7, "2024-06-01", "Die drei Tage im Krankenhaus",
        "Lenas Vater hatte einen Herzinfarkt. Ich bin nachts mit ihr hingefahren, dreieinhalb "
        "Stunden, sie hat die ganze Fahrt gezittert.\n\n"
        "In der Klinik wusste ich endlich einmal genau, was zu tun ist. Mit der Ärztin reden, "
        "Kaffee holen, ihre Mutter beruhigen. Ich habe drei Nächte im Auto geschlafen, und es "
        "hat mir nichts ausgemacht. Im Wartebereich ist Lena an meiner Schulter eingeschlafen, "
        "und ich habe mich zwei Stunden lang nicht bewegt.\n\n"
        "Es klingt vielleicht komisch, aber das waren unsere besten Tage. Sie hat mich "
        "gebraucht, und ich war gut in dem, was ich getan habe.",
        "Nah bei ihr. Ruhig. So habe ich mir uns immer vorgestellt.",
        3, ("Zugewandtheit",),
    ),
    Szene(
        8, "2024-08-18", "Das Handy",
        "Sie war unter der Dusche, ihr Handy lag auf dem Bett und hat vibriert. Jonas. Ich "
        "hatte seit Wochen so ein Gefühl, weil sie abends oft lächelnd aufs Handy geschaut "
        "hat.\n\n"
        "Ich habe den Chat gelesen. Da stand „Du bist die Beste 🙂“. Heute weiß ich, dass das "
        "nichts war, eine Arbeitssache. In dem Moment war es für mich ein Beweis.\n\n"
        "Ich habe gefragt, was sie zu verbergen hat. Das fand ich damals eine berechtigte "
        "Frage. Sie wollte nur darüber reden, dass ich ihr Handy genommen habe, und nicht "
        "darüber, warum ich so unsicher war.\n\n"
        "Am Ende hat sie mir ihren Code gegeben. Ich dachte, dann ist Ruhe in meinem Kopf. "
        "Es war keine Ruhe. Ich habe danach noch ein paar Mal nachgesehen. Nicht oft.",
        "Beschämt über mich und gleichzeitig allein mit meiner Unsicherheit.",
        4, ("Schuldumkehr", "Kontrolle"),
    ),
    Szene(
        9, "2024-09-28", "Tobis Vierzigster",
        "Die Parkhaus-Geschichte erzählt, alle haben gelacht, Lena auch. Im Auto dann wieder "
        "Drama. Man darf bei ihr überhaupt nichts mehr sagen.",
        "Genervt.",
        2, ("Rechtfertigung/Abwehr",),
    ),
    Szene(
        10, "2025-02-02", "Sie hat es gesagt",
        "Es ging wieder um Mira, die am Wochenende kommen wollte. Ich habe gesagt, dann bin "
        "ich eben weg, und einen blöden Spruch gemacht. Dann hat Lena gesagt: „Wenn das so "
        "weitergeht, gehe ich.“\n\n"
        "Ich weiß nicht, wie ich beschreiben soll, was da passiert ist. Es war, als wäre der "
        "Boden weg. Mein Vater hat genau so angefangen. Zweimal angekündigt, beim dritten Mal "
        "war er weg.\n\n"
        "Ich habe geweint und sie angefleht, auf dem Küchenboden. Ich habe versprochen, dass "
        "ich mich ändere, und ich habe es ernst gemeint.\n\n"
        "Sie hat den Satz vorher schon gesagt, im Sommer und im Herbst, aber nie so ruhig. "
        "Diesmal habe ich ihr geglaubt.\n\n"
        "Seitdem gebe ich mir Mühe wie nie. Ich frage, wie ihr Tag war. Ich koche. Ich lade "
        "Mira ein. Und jeden Abend, wenn ich nach Hause komme, schaue ich als Erstes in den "
        "Flur, ob ihre Tasche noch da steht.",
        "Panik. Danach Wochen, in denen ich funktioniert habe wie einer, der eine Prüfung "
        "schreibt.",
        5, ("Drohung", "Anpassung"),
    ),
    Szene(
        11, "2025-09-19", "Hamburg",
        "Drei Tage Hamburg, und sie kommt zurück, als wäre sie jemand anderes. "
        "Abteilungsleiterin. Ich habe gefragt, wie es mit ihren wichtigen Leuten war. Ein "
        "Witz. Sie hat wieder dieses Gesicht gemacht.\n\n"
        "Ich hatte keine Kraft mehr, so zu tun, als wäre alles gut. Monatelang habe ich mich "
        "zusammengerissen, und sie fährt weg und ist glücklich ohne mich.",
        "Leer. Und wütend, ohne zu wissen, auf wen.",
        3, ("Schweigen/Rückzug",),
    ),
    Szene(
        12, "2025-12-24", "Heiligabend",
        "Heiligabend bei meiner Mutter. Lena war fast eine Stunde mit ihrem Vater am Telefon, "
        "im Flur, während meine Mutter mit dem Essen gewartet hat. Meine Mutter hat nichts "
        "gesagt, aber ich habe gesehen, wie sie geguckt hat.\n\n"
        "Im Auto habe ich etwas Falsches über ihren Vater gesagt. Sie hat gesagt, das sei "
        "unfair. Ich habe gemerkt, dass ich gleich laut werde, und das wollte ich nicht, nicht "
        "an Weihnachten. Also habe ich sie vor dem Haus rausgelassen und bin zu Tobi gefahren. "
        "Ich musste raus.\n\n"
        "Dass ihr Schlüssel an meinem Bund hing, habe ich nicht gewusst. Sie hat ihn mir "
        "nachmittags zwischen zwei Geschenktüten in die Hand gedrückt. Mein Handy war auf "
        "lautlos.\n\n"
        "Als ich um halb eins kam, saß sie auf der Treppe. Elf verpasste Anrufe. Ich habe "
        "gesagt, sie hätte ja bei den Nachbarn klingeln können. Ich weiß, wie das klingt.\n\n"
        "Am Morgen habe ich Frühstück gemacht, mit Kerzen. Ich dachte, das sagt mehr als eine "
        "Entschuldigung.",
        "Schuldig und gleichzeitig trotzig. Ich wollte nicht schon wieder der sein, der alles "
        "falsch gemacht hat.",
        4, ("Schuldumkehr", "Schweigen/Rückzug", "Reparatur bleibt aus"),
    ),
    Szene(
        13, "2026-02-22", "Ihre Schwester wartete unten im Auto",
        "Sie hat es am Küchentisch gesagt, ganz ruhig, als würde sie einen Termin absagen. "
        "Ihre Sachen waren schon weg, das habe ich erst danach gesehen. Ihre Schwester hat "
        "unten im Auto gewartet.\n\n"
        "Das hat mir fast am meisten wehgetan. Sie hatte das geplant, mit ihrer Familie, "
        "wochenlang, während sie neben mir geschlafen hat.\n\n"
        "Ich habe gebettelt, ja. Ich habe ihr gesagt, dass sie der einzige Mensch ist, der "
        "mich je wirklich gesehen hat. Als sie bei ihrem Nein blieb, habe ich Dinge gesagt, "
        "die ich nicht sagen wollte. Dass ich für ihren Vater drei Nächte im Auto geschlafen "
        "habe. Dass sie ohne mich nichts auf die Reihe kriegt.\n\n"
        "An dem Abend habe ich ihr viele Nachrichten geschrieben. Was in allen stand, weiß ich "
        "nicht mehr genau.",
        "Fassungslos und verlassen. Stundenlang abwechselnd flehend und wütend.",
        5, ("Schuldumkehr", "Abwertung", "Idealisierung"),
    ),
    Szene(
        14, "2026-04-19", "Was sie erzählt und was ich erzähle",
        "Über Bekannte höre ich, dass Lena überall erzählt, ich sei kontrollierend und kalt "
        "gewesen. Ich erkenne mich darin nicht.\n\n"
        "Also habe ich Tobi und ein paar anderen erzählt, wie es wirklich war. Dass es da "
        "diesen Kollegen gab, mit dem sie ständig geschrieben hat. Das ist ja nicht gelogen. "
        "Es gab ihn.\n\n"
        "Dass ich nie etwas gefunden habe, habe ich nicht dazugesagt. Aufgefallen ist mir das "
        "erst, als Tobis Frau gefragt hat, ob ich mir sicher bin.",
        "Ohnmächtig gegen eine Geschichte, die mich zum Täter macht. Und seit der Frage von "
        "Tobis Frau nicht mehr sicher, ob meine besser ist.",
        3, ("Isolation", "Rechtfertigung/Abwehr"), "guided",
    ),
    Szene(
        15, "2026-08-04", "Was ich eigentlich gesucht habe",
        "Seit Juni gehe ich alle zwei Wochen zu einer Männerberatung. Hingegangen bin ich, um "
        "zu verstehen, was Lena falsch gemacht hat. Das habe ich dem Berater in der ersten "
        "Stunde auch so gesagt.\n\n"
        "Heute hat er nach dem Handy gefragt. Was ich gesucht habe, als ich ihre Nachrichten "
        "gelesen habe.\n\n"
        "Ich habe gesagt: Beweise. Er hat gefragt: Wofür? Ich wollte sagen: dass sie mich "
        "betrügt. Herausgekommen ist: dass sie geht.\n\n"
        "Dann hat er gefragt, was gewesen wäre, wenn ich nie etwas gefunden hätte. Ich habe "
        "nie etwas gefunden. Und ich habe trotzdem weitergesucht, im Handy, bei Mira, in ihrem "
        "Gesicht, als sie aus Hamburg kam.\n\n"
        "Auf dem Heimweg ist mir mein Vater eingefallen. Nicht der, der geschrien hat, sondern "
        "der Junge, der ich war und jeden Abend nachgesehen hat, ob sein Auto noch vor der Tür "
        "steht.\n\n"
        "Ich will nicht, dass jetzt alles meine Schuld ist. Aber ich will auch nicht, dass die "
        "Nächste irgendwann ihre Tasche packt und ich wieder nicht verstehe, warum.",
        "Aufgewühlt. Zum ersten Mal traurig statt wütend.",
        3,
    ),
)

MARCO = Fall(
    anliegen=(
        "Verstehen, warum aus so viel Nähe ständige Kritik wurde, und warum ich am Ende als "
        "der Schuldige dastehe."
    ),
    fragebogen=Fragebogen(
        beziehung=(
            "Zweieinhalb Jahre mit Lena, zwei davon in meiner Wohnung. Der Anfang war das "
            "Beste, was mir je passiert ist. Dann hatte ich immer öfter das Gefühl, nie gut "
            "genug zu sein und mich für alles rechtfertigen zu müssen. Seit der Trennung "
            "erzählt sie eine Geschichte über mich, in der ich mich nicht wiedererkenne."
        ),
        typische_szenen=(
            "Ich plane etwas für uns, und ihr sind ihre Leute wichtiger. Wenn ich mich dann "
            "zurückziehe, um nicht laut zu werden, heißt es, ich würde sie bestrafen."
        ),
        hauptbelastung=(
            "Das Gefühl, der Böse zu sein, obwohl ich mir solche Mühe gegeben habe. Und dass "
            "sie gegangen ist, genau wie sie es angekündigt hat."
        ),
        praegendes_ereignis=(
            "Ihr Geburtstag. Ich hatte wochenlang ein Hotel geplant, und ihr war ein Abend mit "
            "ihren Freundinnen wichtiger. Seitdem ging es immer um meine Fehler."
        ),
        erinnerliche_szenen=(
            "Die drei Tage im Krankenhaus bei ihrem Vater. Der Abend, an dem sie gesagt hat, "
            "dass sie geht, wenn es so weitergeht. Und dass ihre Schwester am Ende unten im "
            "Auto gewartet hat."
        ),
        belastung=6,
        sicherheit="none",
        person_name="Lena",
        vermutungen=(
            ("Gefühl ständiger Kritik", "high"),
            ("Rückzug bei Überforderung", "medium"),
            ("Angst, verlassen zu werden", "medium"),
        ),
    ),
    szenen=_MARCO_SZENEN,
    skalen=(
        Skala("proximity_distance", 68, "medium", (1, 7, 10, 11, 13),
              "Erlebt Lenas Trennungsankündigungen und eigene Wege als drohenden Verlust; "
              "reagiert mit Klammern oder Rückzug."),
        Skala("guilt_shifting", 54, "medium", (2, 5, 8, 12),
              "Fühlt sich regelhaft als der Schuldige; eigene Vorwürfe an Lena stehen in "
              "denselben Szenen."),
        Skala("perception_distortion", 36, "low", (6, 14),
              "Erlebt seine Absichten (Sorge, Planung, Ruhe) als umgedeutet, beginnt aber "
              "selbst zu zweifeln (Szene 14)."),
        Skala("conflict_escalation", 34, "low", (10, 13),
              "Offene Eskalation selten; Konflikte enden eher in Rückzug."),
    ),
    themen={
        "topic_self": (
            "Marco beschreibt sich als loyal, bemüht und mit großer Angst, verlassen zu "
            "werden, die er auf den Weggang des Vaters zurückführt. Eigenen Rückzug erlebt er "
            "als Schutz davor, laut zu werden. In der Beratung beginnt er, Kontrolle als Suche "
            "nach Sicherheit zu verstehen (Szene 15)."
        ),
        "topic_person": (
            "Lena erscheint ihm als zunehmend kritisch, von ihrer Freundin beeinflusst und mit "
            "einem Leben, in dem er nur eine Option unter mehreren ist. Ihre "
            "Trennungsankündigungen erlebt er als Bedrohung, ihre Selbstständigkeit als "
            "Abwendung."
        ),
        "topic_responsibility": (
            "Marco benennt einzelne Fehler ausdrücklich (die Nachricht in der Gruppe, das "
            "Handy), relativiert sie aber meist im selben Atemzug. Wie sein Schweigen und seine "
            "Spitzen auf Lena gewirkt haben, kommt kaum vor."
        ),
    },
    hypothesen={
        "hyp_attachment": (
            "Bei Marco Hinweise auf ängstlich-ambivalente Bindungsanteile mit ausgeprägter "
            "Verlustangst (Weggang des Vaters, Szenen 1 und 10): Autonomieschritte der "
            "Partnerin lösen Kontrolle oder Rückzug aus, Trennungsankündigungen Panik und "
            "Klammern. Tastend, keine Diagnose."
        ),
        "hyp_own_role": (
            "Marcos Eigenanteil liegt in Kontrollhandlungen, die er als Sorge erlebt (Handy, "
            "Konto, Absage des Geburtstags), und in Rückzug, dessen Wirkung auf die Partnerin "
            "er nicht sieht. Erste eigene Einsicht in Szene 15; mit dem Ziel zu würdigen, "
            "Verantwortung ohne Selbstverurteilung zu übernehmen."
        ),
    },
)
