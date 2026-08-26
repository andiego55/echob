# ── Build Stage ───────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Abhängigkeiten aus der SPERRLISTE, nicht aus pyproject.toml.
#
# Vorher stand hier `pip install .` — damit löste jeder Neubau die `>=`-Angaben neu auf und
# konnte andere Versionen ziehen als der letzte. Genau so kam FastAPI 0.115 herein und
# brachte die App zum Stehen, ohne dass jemand etwas geändert hatte.
#
# Eigene Schicht und zuerst kopiert: Die Sperrliste ändert sich selten, der Anwendungscode
# ständig. So bleibt der teure Installationsschritt im Cache, solange nur Code sich ändert.
COPY requirements.lock.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.lock.txt

# Das Anwendungspaket selbst — mit --no-deps, damit es die eben festgenagelten Versionen
# nicht doch noch neu auflöst. pyproject.toml bleibt die lesbare Absichtserklärung
# (welche Bibliotheken, in welchem Rahmen); was tatsächlich installiert wird, steht in
# der Sperrliste.
COPY pyproject.toml .
RUN mkdir -p app && touch app/__init__.py \
 && pip install --no-cache-dir --no-deps "."


# ── Runtime Stage ─────────────────────────────────────────────────────────
# Das Basis-Abbild ist bewusst NICHT auf eine Prüfsumme festgenagelt: `python:3.12-slim`
# wird bei Sicherheitskorrekturen neu gebaut, und dieses Mitwandern ist hier der Vorteil.
# Das Risiko sitzt in den Python-Paketen darüber, nicht im Betriebssystem darunter.
FROM python:3.12-slim

WORKDIR /app

# Installierte Packages aus dem Builder übernehmen
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# App-Code kopieren
COPY app/ ./app/

# Kein Root
RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

EXPOSE 8000

# Production: kein --reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
