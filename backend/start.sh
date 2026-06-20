#!/bin/sh
# Wait for Postgres to accept real connections before starting gunicorn.
# pg_isready (used in the Compose healthcheck) only checks if the process is
# listening; the DB may still be initialising its cluster directory, so we do
# a lightweight Python-level connection retry here as a second guard.

set -e

MAX_RETRIES=30
RETRY_DELAY=2
attempt=1

echo "Waiting for database …"
while [ $attempt -le $MAX_RETRIES ]; do
    python - <<'EOF'
import sys, os
try:
    import sqlalchemy
    url = os.environ["DATABASE_URL"]
    e = sqlalchemy.create_engine(url, pool_pre_ping=False, future=True)
    with e.connect() as conn:
        conn.execute(sqlalchemy.text("SELECT 1"))
    sys.exit(0)
except Exception as err:
    print(f"  DB not ready yet: {err}", file=sys.stderr)
    sys.exit(1)
EOF
    if [ $? -eq 0 ]; then
        echo "Database is ready."
        break
    fi
    echo "  Attempt $attempt/$MAX_RETRIES — retrying in ${RETRY_DELAY}s …"
    attempt=$((attempt + 1))
    sleep $RETRY_DELAY
done

if [ $attempt -gt $MAX_RETRIES ]; then
    echo "ERROR: Could not connect to the database after $MAX_RETRIES attempts." >&2
    exit 1
fi

exec gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    -b "0.0.0.0:${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --timeout 60
