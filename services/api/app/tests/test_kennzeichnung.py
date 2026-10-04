"""Sind erzeugte Bilder und Tonspuren als KI-erzeugt gekennzeichnet — und noch heil?

**Warum (Audit vom 04.10.2026).** Artikel 50 Abs. 2 der KI-Verordnung verlangt eine
maschinenlesbare Markierung synthetisch erzeugter Bild- und Toninhalte. Die
Transparenzpflichten gelten nach dem Stand dieser Datei seit dem 2. August 2026 — die Frist
war bereits verstrichen, als die Kennzeichnung entstand.

**Die zwei Fehler, die hier gleich wahrscheinlich sind** — und der zweite ist der
schlimmere:

1. **Keine Markierung.** Fällt niemandem auf; das Bild sieht gut aus.
2. **Eine Markierung, die die Datei kaputt macht.** Fällt auch niemandem auf, solange
   niemand das Bild öffnet — und dann ist das Ergebnis eines Modellaufrufs verloren, für
   den jemand gewartet und bezahlt hat.

Deshalb prüfen die Tests unten beides: dass das Merkmal drin ist **und** dass die Struktur
hinterher noch gilt (PNG-Chunks mit stimmenden Prüfsummen, ID3-Längen, unveränderte
Tondaten dahinter).
"""
from __future__ import annotations

import struct
import zlib

import pytest

from app.services import kennzeichnung

# ── Ein winziges, echtes PNG zum Arbeiten ────────────────────────────────────

def _png_chunk(typ: bytes, daten: bytes = b"") -> bytes:
    return (struct.pack(">I", len(daten)) + typ + daten
            + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF))


def _mini_png() -> bytes:
    """Ein 1×1-PNG, von Hand gebaut — kein Testbild von der Platte, das jemand verschiebt."""
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    idat = zlib.compress(b"\x00\xff\xff\xff")
    return (b"\x89PNG\r\n\x1a\n" + _png_chunk(b"IHDR", ihdr)
            + _png_chunk(b"IDAT", idat) + _png_chunk(b"IEND"))


def _chunks(png: bytes):
    """Läuft die Chunk-Kette ab und prüft jede Prüfsumme. Wirft, wenn etwas nicht stimmt."""
    pos = 8
    gefunden = []
    while pos < len(png):
        (laenge,) = struct.unpack(">I", png[pos:pos + 4])
        typ = png[pos + 4:pos + 8]
        daten = png[pos + 8:pos + 8 + laenge]
        (crc,) = struct.unpack(">I", png[pos + 8 + laenge:pos + 12 + laenge])
        assert crc == zlib.crc32(typ + daten) & 0xFFFFFFFF, f"Prüfsumme von {typ!r} stimmt nicht"
        gefunden.append((typ, daten))
        pos += 12 + laenge
    return gefunden


# ── Bild ─────────────────────────────────────────────────────────────────────

def test_das_bild_traegt_das_iptc_merkmal():
    """Nicht irgendein Hinweis, sondern **der** Begriff, auf den Werkzeuge schauen."""
    markiert = kennzeichnung.png_kennzeichnen(_mini_png())
    assert kennzeichnung.ist_gekennzeichnet(markiert)
    assert kennzeichnung.IPTC_QUELLE.encode() in markiert


def test_das_png_bleibt_ein_gueltiges_png():
    """**Der wichtigere Test.** Eine Markierung, die die Datei zerstört, ist schlimmer als
    keine: Das Ergebnis eines bezahlten Modellaufrufs wäre verloren."""
    markiert = kennzeichnung.png_kennzeichnen(_mini_png())
    assert markiert.startswith(b"\x89PNG\r\n\x1a\n")
    typen = [typ for typ, _ in _chunks(markiert)]   # prüft jede Prüfsumme
    assert typen[0] == b"IHDR"
    assert typen[-1] == b"IEND", "nach IEND liest kein Betrachter mehr"
    assert b"iTXt" in typen and b"tEXt" in typen


def test_die_markierung_steht_vor_dem_ende_und_nicht_dahinter():
    """Alles hinter IEND ignorieren Betrachter — eine Markierung dort wäre vorhanden und
    unsichtbar zugleich."""
    markiert = kennzeichnung.png_kennzeichnen(_mini_png())
    assert markiert.index(b"iTXt") < markiert.rfind(b"IEND")


def test_die_bilddaten_bleiben_unberuehrt():
    """Was das Modell gemalt hat, wird nicht angefasst — nur ergänzt."""
    roh = _mini_png()
    idat = [d for t, d in _chunks(roh) if t == b"IDAT"]
    nachher = [d for t, d in _chunks(kennzeichnung.png_kennzeichnen(roh)) if t == b"IDAT"]
    assert idat == nachher


def test_was_kein_png_ist_bleibt_unveraendert():
    """Eine fehlende Kennzeichnung ist ein Mangel, ein zerstörtes Bild ein Schaden."""
    muell = b"das ist kein Bild"
    assert kennzeichnung.png_kennzeichnen(muell) == muell


def test_zweimal_kennzeichnen_zerstoert_nichts():
    """Falls der Weg je zweimal durchlaufen wird — die Datei muss heil bleiben."""
    einmal = kennzeichnung.png_kennzeichnen(_mini_png())
    zweimal = kennzeichnung.png_kennzeichnen(einmal)
    typen = [t for t, _ in _chunks(zweimal)]
    assert typen[-1] == b"IEND"


# ── Ton ──────────────────────────────────────────────────────────────────────

_TON = b"\xff\xfb\x90\x00" + b"\x00" * 64   # ein MP3-Rahmenkopf plus Fülldaten


def test_die_tonspur_traegt_das_merkmal_und_beginnt_mit_id3():
    markiert = kennzeichnung.mp3_kennzeichnen(_TON)
    assert markiert.startswith(b"ID3")
    assert kennzeichnung.ist_gekennzeichnet(markiert)


def test_die_groessenangabe_ist_synchronisationssicher():
    """**Die Falle bei ID3.** Jedes der vier Längen-Bytes darf nur sieben Bits nutzen.
    Steht dort ein Byte mit gesetztem höchstem Bit, hält ein Abspieler es für den Anfang
    der Musik und sucht mitten im Etikett nach dem Ton."""
    markiert = kennzeichnung.mp3_kennzeichnen(_TON)
    for byte in markiert[6:10]:
        assert byte < 0x80, "Längenangabe ist nicht synchronisationssicher"


def test_die_angegebene_laenge_trifft_den_tonanfang():
    """Sonst beginnt die Wiedergabe im Etikett oder schneidet den Anfang ab."""
    markiert = kennzeichnung.mp3_kennzeichnen(_TON)
    laenge = 0
    for byte in markiert[6:10]:
        laenge = (laenge << 7) | byte
    assert markiert[10 + laenge:] == _TON, "hinter dem Etikett steht nicht die Tonspur"


def test_die_tondaten_bleiben_unveraendert():
    assert _TON in kennzeichnung.mp3_kennzeichnen(_TON)


def test_leerer_ton_bleibt_leer():
    assert kennzeichnung.mp3_kennzeichnen(b"") == b""


# ── Die Verdrahtung: an der Entstehung, nicht beim Ausliefern ────────────────

def test_bild_und_ton_werden_an_ihrer_entstehung_gekennzeichnet():
    """**Warum das ein Strukturtest ist.** Weiter unten im Ablauf gibt es mehrere Stellen,
    an denen ein Bild das Haus verlässt — anlegen, ausliefern, an die Fachperson freigeben,
    herunterladen. Hinge die Pflicht dort, hinge sie daran, dass niemand eine davon
    vergisst; genau so lagen in diesem Projekt schon einmal Inhalte monatelang unsichtbar
    (vgl. ``gotcha_freigabe_element``).
    """
    import inspect

    from app.services import bild_modell, podcast_stimme

    assert "png_kennzeichnen" in inspect.getsource(bild_modell.BildModell.malen)
    assert "mp3_kennzeichnen" in inspect.getsource(podcast_stimme)


@pytest.mark.parametrize("wert", ["trainedAlgorithmicMedia", "cv.iptc.org"])
def test_der_begriff_ist_der_erwartete(wert):
    """Gekürzt, übersetzt oder selbst erfunden wäre er wertlos — Werkzeuge vergleichen
    gegen genau diese URI."""
    assert wert in kennzeichnung.IPTC_QUELLE
