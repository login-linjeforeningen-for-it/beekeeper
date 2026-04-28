#!/bin/sh
set -eu

TASK="${1:-}"
START_TIME=$(date +%s)

echo "-------------------------------------------"
echo "Flushing ${TASK}..."
echo "Start time: $(date)"
echo "-------------------------------------------"

export PGHOST="${DB_HOST}"

case "${TASK}" in
    logs)
        # Log retention is currently handled upstream; keep the scheduled heartbeat visible.
        ;;
    traffic)
        psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" <<EOF
BEGIN;

-- Delete from traffic older than 1 month
DELETE FROM traffic
WHERE timestamp < NOW() - INTERVAL '1 month';

COMMIT;
EOF
        ;;
    *)
        echo "Unknown flush task: ${TASK}" >&2
        exit 1
        ;;
esac

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "-------------------------------------------"
echo "Done flushing ${TASK}."
echo "End time: $(date)"
echo "Total duration: ${DURATION} seconds"
echo "-------------------------------------------"
