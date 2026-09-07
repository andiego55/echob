"""Admin-Werkzeug des Gründers — abgeschlossenes Paket.

**Die Grenze.** Dieses Paket darf nach unten greifen (``app.core``, ``app.services``,
``app.schemas``), aber **nichts außerhalb darf hier hineingreifen**. Nur ``api/v1/router.py``
bindet ``admin.router`` ein — das ist die einzige Naht. Ein Wächter-Test prüft beides
(``app/tests/test_admin_grenze.py``).

**Warum so streng.** Ein Admin-Werkzeug wächst schnell und in eine andere Richtung als das
Produkt: Es darf umständlich sein, es hat einen einzigen Nutzer, und es braucht Fähigkeiten,
die im Produkt nichts zu suchen haben — Konten anlegen, Passwörter erzeugen, fremde Profile
bearbeiten. Ohne Grenze sickern diese Fähigkeiten in gemeinsam genutzten Code; dann trägt der
öffentliche Verzeichnis-Dienst plötzlich eine Passwort-Erzeugung mit sich herum. Genau das war
hier schon passiert (42 % von ``directory_service.py``), und deshalb steht die Grenze jetzt.

**Was hier NICHT hineingehört:** alles, was auch nur eine Fachperson oder ein Klient benutzt.
Wird etwas davon gebraucht, gehört es nach ``app/services`` und wird von hier importiert.
"""
from app.admin.router import router

__all__ = ["router"]
