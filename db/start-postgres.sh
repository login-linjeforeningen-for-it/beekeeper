#!/bin/sh
set -eu

/usr/local/bin/docker-entrypoint.sh postgres &
postgres_pid=$!

shutdown() {
    kill -TERM "$postgres_pid"
    wait "$postgres_pid"
}

trap shutdown INT TERM

until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; do
    sleep 1
done

psql \
    -v ON_ERROR_STOP=1 \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -f /docker-entrypoint-initdb.d/init.sql

wait "$postgres_pid"
