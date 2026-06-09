# ── Build Stage ───────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY pyproject.toml .
RUN mkdir -p app && touch app/__init__.py

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir "."


# ── Runtime Stage ─────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY app/ ./app/

RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

# Phase 4: wird durch ARQ-Worker-Command ersetzt
CMD ["python", "-m", "app.main"]
