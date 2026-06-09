# EchoB – Roadmap

---

## Phase 0 – Projektgerüst & statische Präsenz

**Ziel:** Sichtbarkeit aufbauen, bevor die App fertig ist.

- [x] Monorepo-Struktur anlegen
- [x] Dokumentation (Architektur, Prinzipien, Claims)
- [x] Statische Website (`static-site/`)
- [ ] Statische Website deployen (Cloudflare Pages o. ä.)
- [ ] Wartelisten-Formular anschließen (Tally, Formspree o. ä.)
- [ ] Onboarding-Prototyp (statisch, kein Backend)

---

## Phase 1 – React-Frontend & echtes Backend

**Ziel:** Erste echte Nutzererfahrung mit Datenspeicherung.

- [ ] React-App (`apps/web`) initialisieren (Vite + TypeScript)
- [ ] Tailwind CSS einrichten
- [ ] Routing (React Router v6)
- [ ] Supabase-Projekt anlegen
- [ ] Supabase Auth integrieren (E-Mail-Login)
- [ ] FastAPI-Backend lokal lauffähig machen
- [ ] Warteliste-Endpoint (`POST /waitlist`)
- [ ] Onboarding-Formular mit Speicherung
- [ ] Coaching-Lead-Formular
- [ ] Backend deployen (Render o. ä.)

---

## Phase 2 – Nutzerkonto & Ereignisprotokoll

**Ziel:** Nutzende können sich anmelden und Ereignisse erfassen.

- [ ] Eingeloggter Bereich (Dashboard)
- [ ] Nutzerfälle anlegen (`POST /cases`)
- [ ] Ereignisse erfassen (`POST /events`)
- [ ] Ereignisliste anzeigen
- [ ] Grundlegende Datenschutzfunktionen (Daten löschen, exportieren)

---

## Phase 3 – AI-Chat & Musterübersicht

**Ziel:** Kernfunktion von EchoB: Reflexionsdialog und Mustererkennung.

- [ ] Reflexionsdialog (AI-Chat, Claude API)
- [ ] Ereignisextraktion aus Chatverläufen
- [ ] Musterklassifikation (Beobachtungshypothesen)
- [ ] Musterübersicht im Dashboard
- [ ] Skalen (z. B. emotionale Belastung, Verwirrung, Selbstzweifel)

---

## Phase 4 – Reports & PDF-Export

**Ziel:** Strukturierte Zusammenfassungen für Coaching und Therapie.

- [ ] Worker-Infrastruktur (ARQ + Redis)
- [ ] Report-Generierung (Zusammenfassung aus Ereignissen + Mustern)
- [ ] PDF-Export (WeasyPrint)
- [ ] Report-Sharing (sicherer Link oder direkter Download)
- [ ] Coaching-Integration (Buchungs-Link, Kalender)

---

## Phase 5 – Fachpersonenbereich

**Ziel:** Therapeut:innen und Coaches können EchoB-Reports einsehen (mit Einwilligung).

- [ ] Fachpersonen-Account-Typ
- [ ] Report-Freigabe durch Nutzende
- [ ] Therapeut:innen-Dashboard (nur freigegebene Berichte)
- [ ] Coaching-Lead-Management
