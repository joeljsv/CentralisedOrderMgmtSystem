# Production-ready backend image
FROM python:3.12-slim

# Keep Python lean and predictable in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app

# Run as a non-root user
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

# Container-level health check hitting the API's /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; \
sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else sys.exit(1)"

# Bind to $PORT when provided (Render injects it); default to 8000 locally.
# Use the shell form so ${PORT:-8000} is expanded at runtime.
CMD gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    -b 0.0.0.0:${PORT:-8000} \
    --workers ${WEB_CONCURRENCY:-2} \
    --timeout 60
