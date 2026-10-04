"""Erzeugte Bilder und Tonspuren als KI-erzeugt kennzeichnen.

**Warum.** Artikel 50 Absatz 2 der KI-Verordnung verlangt, dass synthetisch erzeugte Bild-,
Ton- und Videoinhalte **maschinenlesbar** als solche markiert und erkennbar sind. Für die
Transparenzpflichten gilt nach dem Stand dieser Datei der 2. August 2026 — die Frist ist
also bereits verstrichen, als dieses Modul entstand (4. Oktober 2026).

**Was NICHT darunter fällt**, damit hier nichts überbaut wird: erzeugter *Text*. Die Pflicht
trifft dort nur Texte, die veröffentlicht werden, um die Öffentlichkeit über Angelegenheiten
von öffentlichem Interesse zu unterrichten. Ein Bericht über die eigene Beziehung ist das
nicht. Und die Vorschriften über Deepfakes greifen hier ebenfalls nicht: Die Bildwerkstatt
bildet niemanden ab — die Erscheinung der einzigen erlaubten Gestalt ist ausdrücklich
erfunden, und die beschriebene Fallperson darf nie nah und nie mit Gesicht vorkommen.

**Wie markiert wird.** Zwei Ebenen, weil keine allein genügt:

* **IPTC ``DigitalSourceType``** mit dem Wert ``trainedAlgorithmicMedia`` — das ist das
  Merkmal, auf das Werkzeuge, Plattformen und Prüfer tatsächlich schauen. Im PNG als
  XMP-Paket, in der MP3 als ID3-Feld.
* **Ein lesbarer Satz** im selben Datensatz, für den Menschen, der die Datei irgendwann in
  einem Betrachter öffnet und sich fragt, woher sie kommt.

**Was das ausdrücklich NICHT ist: C2PA.** Eine kryptografisch signierte Herkunftskette wäre
die stärkere Form und ist der Weg, den die Branche geht. Sie braucht Schlüssel, eine
Zertifikatskette und Pflege — das ist ein eigenes Vorhaben. Was hier steht, ist eine
Markierung, die man entfernen kann, ohne dass es auffällt. Sie erfüllt die Pflicht in ihrer
einfachen Form und ersetzt die starke nicht; wer sie für fälschungssicher hält, irrt.

**Kein sichtbares Wasserzeichen.** Die Pflicht verlangt Maschinenlesbarkeit, nicht einen
Schriftzug im Bild. Ein eingebranntes Wasserzeichen würde genau das zerstören, wofür die
Bilder gemacht sind — und der Hinweis an die lesende Person steht ohnehin in der
Oberfläche, an der Kachel und beim Mitnehmen.
"""
from __future__ import annotations

import struct
import zlib

from app.core.logging import get_logger

logger = get_logger(__name__)

#: Der IPTC-Begriff für „von einem trainierten Modell erzeugt". Der Wert ist eine URI und
#: wird genau so erwartet — gekürzt oder übersetzt ist er wertlos.
IPTC_QUELLE = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"

#: Der Satz für Menschen. Zweisprachig, weil eine Datei das Land wechselt.
HINWEIS = (
    "Mit KI erzeugt (EchoB). AI-generated image or audio, created with EchoB. "
    "Kein Abbild realer Personen. Not a depiction of real persons."
)

_XMP = (
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">'
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    '<rdf:Description rdf:about=""'
    ' xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"'
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:xmp="http://ns.adobe.com/xap/1.0/">'
    '<Iptc4xmpExt:DigitalSourceType>{quelle}</Iptc4xmpExt:DigitalSourceType>'
    '<xmp:CreatorTool>EchoB</xmp:CreatorTool>'
    '<dc:description><rdf:Alt><rdf:li xml:lang="x-default">{hinweis}</rdf:li>'
    '</rdf:Alt></dc:description>'
    '</rdf:Description></rdf:RDF></x:xmpmeta>'
    '<?xpacket end="w"?>'
)


# ── PNG ──────────────────────────────────────────────────────────────────────

_PNG_MAGIE = b"\x89PNG\r\n\x1a\n"


def _png_chunk(typ: bytes, daten: bytes) -> bytes:
    """Ein PNG-Chunk: Länge, Typ, Daten, Prüfsumme über Typ+Daten."""
    return (struct.pack(">I", len(daten)) + typ + daten
            + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF))


def png_kennzeichnen(bild: bytes) -> bytes:
    """Hängt XMP und einen lesbaren Hinweis in das PNG.

    **Vor dem IEND, nicht dahinter.** Alles nach dem Endchunk ignorieren Betrachter — eine
    Markierung dort wäre vorhanden und unsichtbar zugleich, was schlimmer ist als keine.

    Ist das Bild kein PNG oder unvollständig, bleibt es unverändert: Eine fehlende
    Kennzeichnung ist ein Mangel, ein zerstörtes Bild ein Schaden.
    """
    if not bild.startswith(_PNG_MAGIE):
        logger.warning("Kennzeichnung: kein PNG, Bild bleibt unmarkiert (%d Bytes)", len(bild))
        return bild

    ende = bild.rfind(b"IEND")
    if ende < 4:
        logger.warning("Kennzeichnung: PNG ohne IEND, Bild bleibt unmarkiert")
        return bild
    schnitt = ende - 4  # vor die Längenangabe des IEND-Chunks

    xmp = _XMP.format(quelle=IPTC_QUELLE, hinweis=HINWEIS).encode("utf-8")
    # iTXt: Schlüsselwort, Kompressionsflag, Kompressionsmethode, Sprache, Übersetzung, Text
    itxt = b"XML:com.adobe.xmp\x00\x00\x00\x00\x00" + xmp
    # tEXt daneben, für Werkzeuge, die kein XMP lesen. Latin-1, wie die Norm es verlangt.
    texte = b"".join([
        _png_chunk(b"iTXt", itxt),
        _png_chunk(b"tEXt", b"Software\x00EchoB"),
        _png_chunk(b"tEXt", b"Comment\x00" + HINWEIS.encode("latin-1", "replace")),
        _png_chunk(b"tEXt", b"DigitalSourceType\x00" + IPTC_QUELLE.encode("latin-1")),
    ])
    return bild[:schnitt] + texte + bild[schnitt:]


# ── MP3 ──────────────────────────────────────────────────────────────────────

def _syncsafe(zahl: int) -> bytes:
    """ID3-Größenangabe: vier Bytes zu je sieben nutzbaren Bits.

    Das höchste Bit bleibt frei, damit die Größe nie wie ein Audio-Synchronisationswort
    aussieht — sonst suchte ein Abspieler mitten im Tag nach dem Anfang der Musik.
    """
    return bytes([(zahl >> 21) & 0x7F, (zahl >> 14) & 0x7F,
                  (zahl >> 7) & 0x7F, zahl & 0x7F])


def _id3_frame(kennung: bytes, daten: bytes) -> bytes:
    return kennung + _syncsafe(len(daten)) + b"\x00\x00" + daten


def mp3_kennzeichnen(ton: bytes) -> bytes:
    """Stellt der MP3 ein ID3v2.4-Etikett voran.

    **Vorangestellt und nicht eingefügt.** Ein ID3v2-Tag gehört an den Anfang; Abspieler
    lesen seine Länge und springen darüber hinweg. Bringt die Datei schon eines mit, steht
    unseres davor — beide bleiben lesbar, und die Tonspur beginnt unverändert dahinter.
    """
    if not ton:
        return ton

    def txxx(bezeichnung: str, wert: str) -> bytes:
        # Textkodierung 0x03 = UTF-8; Beschreibung und Wert mit Nullbyte getrennt.
        return _id3_frame(b"TXXX", b"\x03" + bezeichnung.encode("utf-8")
                          + b"\x00" + wert.encode("utf-8"))

    rahmen = b"".join([
        txxx("DigitalSourceType", IPTC_QUELLE),
        txxx("Generator", "EchoB"),
        # COMM: Kodierung, Sprache, kurze Beschreibung, Text.
        _id3_frame(b"COMM", b"\x03ger\x00" + HINWEIS.encode("utf-8")),
        _id3_frame(b"TENC", b"\x03EchoB"),
    ])
    kopf = b"ID3" + b"\x04\x00" + b"\x00" + _syncsafe(len(rahmen))
    return kopf + rahmen + ton


# ── Prüfen (für Tests und für die Hand) ──────────────────────────────────────

def ist_gekennzeichnet(daten: bytes) -> bool:
    """Trägt diese Datei die Kennzeichnung?

    Sucht nach dem IPTC-Begriff — er ist in beiden Formaten der tragende Teil, und ein
    Vergleich auf ihn prüft das, worauf es ankommt, statt auf unsere Formulierung.
    """
    return IPTC_QUELLE.encode("utf-8") in daten or IPTC_QUELLE.encode("latin-1") in daten
