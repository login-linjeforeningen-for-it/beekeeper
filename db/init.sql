DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'beekeeper') THEN
        CREATE DATABASE beekeeper;
    END IF;
END $$;

\c beekeeper

DO $$
DECLARE
    user_password text;
BEGIN
    user_password := current_setting('db_password', true);

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'beekeeper') THEN
        EXECUTE format('CREATE USER beekeeper WITH ENCRYPTED PASSWORD %L', user_password);
        EXECUTE 'GRANT ALL PRIVILEGES ON DATABASE beekeeper TO beekeeper';
    END IF;
END $$;

-- Docker containers
CREATE TABLE IF NOT EXISTS containers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    container TEXT NOT NULL,
    rebuild BOOLEAN NOT NULL DEFAULT false
);

-- Traffic table
CREATE TABLE IF NOT EXISTS traffic (
    id SERIAL PRIMARY KEY,
    user_agent TEXT NOT NULL,
    domain TEXT NOT NULL,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    referer TEXT NOT NULL,
    request_time DOUBLE PRECISION NOT NULL,
    status INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    country_iso TEXT
);

-- Status table
CREATE TABLE IF NOT EXISTS status (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fetch', 'post', 'tcp')),
    url TEXT,
    notification INTEGER,
    interval INTEGER NOT NULL,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    expected_down BOOLEAN NOT NULL DEFAULT FALSE,
    upside_down BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent TEXT,
    max_consecutive_failures INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    notified TIMESTAMPTZ,
    tags INTEGER[] DEFAULT '{}',
    port INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS status_details (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES status(id) ON DELETE CASCADE,
    expected_down BOOLEAN NOT NULL DEFAULT FALSE,
    upside_down BOOLEAN NOT NULL DEFAULT FALSE,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    delay INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Status notifications table
CREATE TABLE IF NOT EXISTS status_notifications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    message TEXT,
    webhook TEXT NOT NULL
);

-- Status tags
CREATE TABLE IF NOT EXISTS status_tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
);

-- Loadbalancing
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT FALSE,
    operational BOOLEAN NOT NULL DEFAULT FALSE,
    added_by TEXT NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    maintenance BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT
);

-- Indexes for sites
CREATE UNIQUE INDEX primary_site ON sites ("primary") WHERE "primary" = TRUE;

-- Indexes for traffic
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON traffic (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_domain_trgm ON traffic (domain);
CREATE INDEX IF NOT EXISTS idx_traffic_path_trgm ON traffic (path);
CREATE INDEX IF NOT EXISTS idx_traffic_user_agent_trgm ON traffic (user_agent);
CREATE INDEX IF NOT EXISTS idx_traffic_status ON traffic (status);
CREATE INDEX IF NOT EXISTS idx_traffic_method ON traffic (method);
CREATE INDEX IF NOT EXISTS idx_traffic_domain_btree ON traffic (domain);
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp_status ON traffic (timestamp DESC, status);
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp_domain ON traffic (timestamp DESC, domain);
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp_method ON traffic (timestamp DESC, method);
CREATE INDEX IF NOT EXISTS idx_traffic_domain_timestamp ON traffic (domain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp_path ON traffic (timestamp DESC, path);
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp_user_agent ON traffic (timestamp DESC, user_agent);

-- --- Local log optimizations ---

-- Heavy operations, more RAM required
SET maintenance_work_mem = '1GB';

-- Indexes to speed up local log refresh query
CREATE INDEX ON local_log (LOWER(namespace));
CREATE INDEX ON local_log (LOWER(context));

-- Trigram indexes for ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Lowers RAM
SET maintenance_work_mem = '4MB';

-- Adds parallel workers
SET max_parallel_workers_per_gather = 4;
