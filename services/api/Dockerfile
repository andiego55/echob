# ── Build Stage ───────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Nur pyproject.toml kopieren, damit der Dependency-Layer gecacht bleibt
COPY pyproject.toml .

# Leeres app-Package für pip install -e (braucht das Package-Root)
RUN mkdir -p app && touch app/__init__.py

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir "."


# ── Runtime Stage ─────────────────────────────────────────────────────────
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
