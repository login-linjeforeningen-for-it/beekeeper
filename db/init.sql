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
CREATE UNIQUE INDEX IF NOT EXISTS primary_site ON sites ("primary") WHERE "primary" = TRUE;

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    original_client_name TEXT NOT NULL,
    active_client_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_conversations
    ADD COLUMN IF NOT EXISTS owner_user_id TEXT,
    ADD COLUMN IF NOT EXISTS owner_session_id TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE,
    ADD COLUMN IF NOT EXISTS shared_from_conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL;

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

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_created_at_idx
ON ai_messages (conversation_id, created_at ASC);

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
