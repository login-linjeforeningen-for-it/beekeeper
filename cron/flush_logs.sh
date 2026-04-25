#!/bin/sh

START_TIME=$(date +%s)

echo "-------------------------------------------"
echo "Flushing logs..."
echo "Start time: $(date)"
echo "-------------------------------------------"

export PGHOST="${DB_HOST}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "-------------------------------------------"
echo "Done flushing logs."
echo "End time: $(date)"
echo "Total duration: ${DURATION} seconds"
echo "-------------------------------------------"
