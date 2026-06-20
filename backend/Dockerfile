# Production-ready backend image
FROM python:3.12-slim

# Keep Python lean and predictable in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first — separate layer so code changes don't re-install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and startup script
COPY app ./app
COPY start.sh ./start.sh

# Make startup script executable
RUN chmod +x start.sh

# Run as a non-root user for security
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Container-level health check: hits the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c \
        "import urllib.request,sys; r=urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=3); sys.exit(0 if r.status==200 else 1)"

# start.sh: waits for Postgres, then execs gunicorn
CMD ["./start.sh"]
