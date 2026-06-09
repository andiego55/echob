# EchoB – Statische Website

Sofort hostbare statische HTML-Seiten. Kein Build-System, kein npm, keine Dependencies.

## Lokal öffnen

Einfach `index.html` per Doppelklick im Browser öffnen.

Oder mit lokalem Server (empfohlen für korrekte Links):

```bash
cd static-site
python -m http.server 8080
# → http://localhost:8080
```

## Deployen

Den gesamten Inhalt dieses Ordners hochladen bei:
- **Cloudflare Pages** (empfohlen): Ordner direkt droppen
- **Netlify Drop**: netlify.com/drop
- **GitHub Pages**: Repository mit diesem Ordner als Root

## Seiten

| Datei               | Inhalt                        |
|---------------------|-------------------------------|
| `index.html`        | Startseite / Landingpage      |
| `app.html`          | App-Übersicht                 |
| `coaching.html`     | Coaching-Angebot              |
| `wissen.html`       | Wissensbereich (Platzhalter)  |
| `fachpersonen.html` | Für Fachpersonen              |
| `ueber.html`        | Über EchoB                    |
| `erstcheck.html`    | Kostenlosen Erstcheck starten |
| `onboarding.html`   | Onboarding (Platzhalter)      |
| `warteliste.html`   | Warteliste eintragen          |
| `datenschutz.html`  | Datenschutzerklärung          |
| `impressum.html`    | Impressum                     |
| `styles.css`        | Gemeinsames Stylesheet        |
