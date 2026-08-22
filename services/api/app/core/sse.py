"""Server-Sent Events: die Rahmung, die beide Stroeme teilen.

**Warum das eine eigene Datei ist.** SSE trennt Ereignisse durch eine LEERZEILE. Echos
Antworten bestehen aus Absaetzen, enthalten also staendig doppelte Zeilenumbrueche - ohne
Maskierung zerfiele ein Ereignis in zwei und der Client bekaeme Bruchstuecke. Dass es
funktioniert, liegt allein an `json.dumps`, und das ist richtig, aber unsichtbar.

Es gibt inzwischen zwei Stroeme (Fall-Echo und Paar-Begleiter) und der Client liest beide
mit demselben Leser. Zwei Kopien dieser drei Zeilen wuerden irgendwann auseinanderlaufen -
und zwar auf eine Art, die erst bei mehrzeiligen Antworten auffaellt, also nicht in der
Entwicklung, sondern beim Nutzer. Eine Stelle, eine Pruefung (`test_sse_format.py`).
"""
from __future__ import annotations

import json


def ereignis(typ: str, **felder) -> str:
    """Ein Server-Sent Event. Eine Zeile JSON, doppelter Zeilenumbruch als Trenner.

    ``ensure_ascii=False`` haelt Umlaute lesbar; die Maskierung der Zeilenumbrueche
    besorgt `json.dumps` ohnehin. Wer diese Zeile auf einen f-String umschreibt, weil das
    "einfacher" aussieht, bricht das Protokoll.
    """
    return "data: " + json.dumps({"typ": typ, **felder}, ensure_ascii=False) + "\n\n"
