SET client_min_messages TO WARNING;

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
    expected_status INTEGER,
    max_consecutive_failures INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    notified TIMESTAMPTZ,
    tags INTEGER[] DEFAULT '{}',
    port INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO status (name, type, url, notification, interval, expected_down, upside_down, max_consecutive_failures, note, enabled, expected_status)
SELECT 'S3', 'fetch', 'https://s3.login.no/', 4, 60, FALSE, FALSE, 0, 's3.login.no', TRUE, 403
WHERE NOT EXISTS (SELECT 1 FROM status WHERE name = 'S3');

INSERT INTO status (name, type, url, notification, interval, expected_down, upside_down, max_consecutive_failures, note, enabled, expected_status)
SELECT 'Spaces', 'fetch', 'https://spaces.login.no/', 4, 60, FALSE, FALSE, 0, 'spaces.login.no', TRUE, 403
WHERE NOT EXISTS (SELECT 1 FROM status WHERE name = 'Spaces');

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
CREATE UNIQUE INDEX IF NOT EXISTS primary_site ON sites ("primary") WHERE "primary" = TRUE;

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    original_client_name TEXT NOT NULL,
    active_client_name TEXT NOT NULL,
    owner_user_id TEXT,
    owner_session_id TEXT,
    deleted_at TIMESTAMPTZ,
    share_token UUID UNIQUE,
    shared_from_conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    last_message_preview TEXT,
    last_message_role TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL,
    error BOOLEAN NOT NULL DEFAULT FALSE,
    client_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_conversations_updated_at_idx
ON ai_conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS ai_conversations_owner_user_id_idx
ON ai_conversations (owner_user_id);

CREATE INDEX IF NOT EXISTS ai_conversations_owner_session_id_idx
ON ai_conversations (owner_session_id);

CREATE INDEX IF NOT EXISTS ai_conversations_deleted_at_idx
ON ai_conversations (deleted_at DESC);

CREATE INDEX IF NOT EXISTS ai_conversations_share_token_idx
ON ai_conversations (share_token);

CREATE INDEX IF NOT EXISTS ai_conversations_owner_user_deleted_updated_idx
ON ai_conversations (owner_user_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS ai_conversations_owner_session_deleted_updated_idx
ON ai_conversations (owner_session_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_created_at_idx
ON ai_messages (conversation_id, created_at ASC);

-- Scout state
CREATE TABLE IF NOT EXISTS scout_state (
    id INTEGER PRIMARY KEY,
    updated_at TEXT,
    project_root TEXT NOT NULL DEFAULT '',
    projects_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    projects_interval_minutes INTEGER NOT NULL DEFAULT 1,
    projects_last_started_at TEXT,
    projects_last_finished_at TEXT,
    projects_last_success_at TEXT,
    projects_last_error TEXT,
    projects_result JSONB,
    one_password_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    one_password_interval_minutes INTEGER NOT NULL DEFAULT 30,
    one_password_last_started_at TEXT,
    one_password_last_finished_at TEXT,
    one_password_last_success_at TEXT,
    one_password_last_error TEXT,
    one_password_result JSONB,
    CHECK (id = 1)
);

ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS project_root TEXT NOT NULL DEFAULT '';
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_interval_minutes INTEGER NOT NULL DEFAULT 1;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_started_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_finished_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_success_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_error TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_result JSONB;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_interval_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_started_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_finished_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_success_at TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_error TEXT;
ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_result JSONB;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scout_state'
          AND column_name = 'state'
    ) THEN
        UPDATE scout_state
        SET updated_at = COALESCE(updated_at, state->>'updatedAt'),
            project_root = CASE
                WHEN project_root = '' THEN COALESCE(state->>'projectRoot', '')
                ELSE project_root
            END,
            projects_enabled = COALESCE((state->'projects'->>'enabled')::boolean, projects_enabled),
            projects_interval_minutes = COALESCE((state->'projects'->>'intervalMinutes')::integer, projects_interval_minutes),
            projects_last_started_at = COALESCE(projects_last_started_at, state->'projects'->>'lastStartedAt'),
            projects_last_finished_at = COALESCE(projects_last_finished_at, state->'projects'->>'lastFinishedAt'),
            projects_last_success_at = COALESCE(projects_last_success_at, state->'projects'->>'lastSuccessAt'),
            projects_last_error = COALESCE(projects_last_error, state->'projects'->>'lastError'),
            projects_result = COALESCE(projects_result, state->'projects'->'result'),
            one_password_enabled = COALESCE((state->'onePassword'->>'enabled')::boolean, one_password_enabled),
            one_password_interval_minutes = COALESCE((state->'onePassword'->>'intervalMinutes')::integer, one_password_interval_minutes),
            one_password_last_started_at = COALESCE(one_password_last_started_at, state->'onePassword'->>'lastStartedAt'),
            one_password_last_finished_at = COALESCE(one_password_last_finished_at, state->'onePassword'->>'lastFinishedAt'),
            one_password_last_success_at = COALESCE(one_password_last_success_at, state->'onePassword'->>'lastSuccessAt'),
            one_password_last_error = COALESCE(one_password_last_error, state->'onePassword'->>'lastError'),
            one_password_result = COALESCE(one_password_result, state->'onePassword'->'result')
        WHERE state IS NOT NULL;

        ALTER TABLE scout_state DROP COLUMN state;
    END IF;
END $$;

INSERT INTO scout_state (
    id,
    updated_at,
    project_root,
    projects_enabled,
    projects_interval_minutes,
    projects_last_started_at,
    projects_last_finished_at,
    projects_last_success_at,
    projects_last_error,
    projects_result,
    one_password_enabled,
    one_password_interval_minutes,
    one_password_last_started_at,
    one_password_last_finished_at,
    one_password_last_success_at,
    one_password_last_error,
    one_password_result
)
VALUES (
    1,
    NULL,
    '',
    TRUE,
    1,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    30,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
)
ON CONFLICT (id) DO NOTHING;

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

-- Trigram indexes for ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Lowers RAM
SET maintenance_work_mem = '4MB';

-- Adds parallel workers
SET max_parallel_workers_per_gather = 4;
