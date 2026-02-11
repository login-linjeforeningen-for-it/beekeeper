#!/bin/sh

START_TIME=$(date +%s)

echo "-------------------------------------------"
echo "Flushing traffic..."
echo "Start time: $(date)"
echo "-------------------------------------------"

export PGHOST="${DB_HOST}"

psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" <<EOF
BEGIN;

-- Delete from traffic older than 1 month
DELETE FROM traffic
WHERE timestamp < NOW() - INTERVAL '1 month';

COMMIT;
EOF

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "-------------------------------------------"
echo "Done flushing traffic."
echo "End time: $(date)"
echo "Total duration: ${DURATION} seconds"
echo "-------------------------------------------"
