import path from 'path'
import run from '#db'
import scoutEmitter from './emitter.ts'

type ScoutRow = {
    updated_at: string | null
    project_root: string
    projects_enabled: boolean
    projects_interval_minutes: number
    projects_last_started_at: string | null
    projects_last_finished_at: string | null
    projects_last_success_at: string | null
    projects_last_error: string | null
    projects_result: unknown
    one_password_enabled: boolean
    one_password_interval_minutes: number
    one_password_last_started_at: string | null
    one_password_last_finished_at: string | null
    one_password_last_success_at: string | null
    one_password_last_error: string | null
    one_password_result: unknown
}

const DEFAULT_PROJECT_ROOT = path.resolve(process.cwd(), '../..')
const SCOUT_STATE_ID = 1
const SCOUT_COLUMNS = `
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
`

let state: Scout = createInitialState()
let readyPromise: Promise<void> | null = null

export async function ensureScout() {
    if (!readyPromise) {
        readyPromise = loadState()
    }

    await readyPromise
}

export function getScout() {
    return structuredClone(state)
}

export async function updateScout(mutator: (draft: Scout) => void) {
    await ensureScout()
    mutator(state)
    state.updatedAt = new Date().toISOString()
    await persistState()
    broadcast()
}

export function getDefaultProjectRoot() {
    return DEFAULT_PROJECT_ROOT
}

async function loadState() {
    await ensureScoutTable()
    await migrateLegacyScoutState()
    const initialState = createInitialState()
    await ensureScoutRow(initialState)
    const result = await run(
        `SELECT ${SCOUT_COLUMNS}
        FROM scout_state
        WHERE id = $1`,
        [SCOUT_STATE_ID]
    )

    const nextState = normalizeScoutRow(result.rows[0])
    state = nextState

    if (!result.rows[0] || !scoutRowsEqual(result.rows[0], nextState)) {
        await persistState()
    }
}

async function persistState() {
    const values = toScoutRow(state)
    await run(
        `UPDATE scout_state
        SET updated_at = $2,
            project_root = $3,
            projects_enabled = $4,
            projects_interval_minutes = $5,
            projects_last_started_at = $6,
            projects_last_finished_at = $7,
            projects_last_success_at = $8,
            projects_last_error = $9,
            projects_result = $10::jsonb,
            one_password_enabled = $11,
            one_password_interval_minutes = $12,
            one_password_last_started_at = $13,
            one_password_last_finished_at = $14,
            one_password_last_success_at = $15,
            one_password_last_error = $16,
            one_password_result = $17::jsonb
        WHERE id = $1`,
        [SCOUT_STATE_ID, ...values]
    )
}

async function ensureScoutTable() {
    await run(
        `CREATE TABLE IF NOT EXISTS scout_state (
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
        )`
    )

    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS updated_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS project_root TEXT NOT NULL DEFAULT \'\'')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_enabled BOOLEAN NOT NULL DEFAULT TRUE')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_interval_minutes INTEGER NOT NULL DEFAULT 1')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_started_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_finished_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_success_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_last_error TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS projects_result JSONB')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_enabled BOOLEAN NOT NULL DEFAULT FALSE')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_interval_minutes INTEGER NOT NULL DEFAULT 30')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_started_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_finished_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_success_at TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_last_error TEXT')
    await run('ALTER TABLE scout_state ADD COLUMN IF NOT EXISTS one_password_result JSONB')
}

async function ensureScoutRow(initialState: Scout) {
    const values = toScoutRow(initialState)
    await run(
        `INSERT INTO scout_state (
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
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17::jsonb
        )
        ON CONFLICT (id) DO NOTHING`,
        [SCOUT_STATE_ID, ...values]
    )
}

async function migrateLegacyScoutState() {
    const hasLegacyStateColumn = await run(
        `SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'scout_state'
              AND column_name = 'state'
        ) AS exists`
    )

    if (!hasLegacyStateColumn.rows[0]?.exists) {
        return
    }

    await run(
        `UPDATE scout_state
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
        WHERE state IS NOT NULL`
    )

    await run('ALTER TABLE scout_state DROP COLUMN IF EXISTS state')
}

function normalizeScoutRow(row: ScoutRow | null | undefined): Scout {
    const initialState = createInitialState()

    return {
        ...initialState,
        updatedAt: row?.updated_at ?? initialState.updatedAt,
        projectRoot: row?.project_root || initialState.projectRoot,
        projects: {
            ...initialState.projects,
            enabled: row?.projects_enabled ?? initialState.projects.enabled,
            intervalMinutes: row?.projects_interval_minutes ?? initialState.projects.intervalMinutes,
            lastStartedAt: row?.projects_last_started_at ?? initialState.projects.lastStartedAt,
            lastFinishedAt: row?.projects_last_finished_at ?? initialState.projects.lastFinishedAt,
            lastSuccessAt: row?.projects_last_success_at ?? initialState.projects.lastSuccessAt,
            lastError: row?.projects_last_error ?? initialState.projects.lastError,
            result: normalizeJsonValue(row?.projects_result) as Scout['projects']['result']
        },
        onePassword: {
            ...initialState.onePassword,
            enabled: row?.one_password_enabled ?? initialState.onePassword.enabled,
            intervalMinutes: row?.one_password_interval_minutes ?? initialState.onePassword.intervalMinutes,
            lastStartedAt: row?.one_password_last_started_at ?? initialState.onePassword.lastStartedAt,
            lastFinishedAt: row?.one_password_last_finished_at ?? initialState.onePassword.lastFinishedAt,
            lastSuccessAt: row?.one_password_last_success_at ?? initialState.onePassword.lastSuccessAt,
            lastError: row?.one_password_last_error ?? initialState.onePassword.lastError,
            result: normalizeJsonValue(row?.one_password_result) as Scout['onePassword']['result']
        }
    }
}

function toScoutRow(value: Scout) {
    return [
        value.updatedAt,
        value.projectRoot,
        value.projects.enabled,
        value.projects.intervalMinutes,
        value.projects.lastStartedAt,
        value.projects.lastFinishedAt,
        value.projects.lastSuccessAt,
        value.projects.lastError,
        serializeJson(value.projects.result),
        value.onePassword.enabled,
        value.onePassword.intervalMinutes,
        value.onePassword.lastStartedAt,
        value.onePassword.lastFinishedAt,
        value.onePassword.lastSuccessAt,
        value.onePassword.lastError,
        serializeJson(value.onePassword.result)
    ] satisfies (string | number | boolean | null)[]
}

function normalizeJsonValue(value: unknown) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value)
        } catch {
            return value
        }
    }

    return value ?? null
}

function serializeJson(value: unknown) {
    return value === null || value === undefined
        ? null
        : JSON.stringify(value)
}

function scoutRowsEqual(row: ScoutRow, value: Scout) {
    const next = toScoutRow(value)

    return row.updated_at === next[0]
        && row.project_root === next[1]
        && row.projects_enabled === next[2]
        && row.projects_interval_minutes === next[3]
        && row.projects_last_started_at === next[4]
        && row.projects_last_finished_at === next[5]
        && row.projects_last_success_at === next[6]
        && row.projects_last_error === next[7]
        && serializeJson(normalizeJsonValue(row.projects_result)) === next[8]
        && row.one_password_enabled === next[9]
        && row.one_password_interval_minutes === next[10]
        && row.one_password_last_started_at === next[11]
        && row.one_password_last_finished_at === next[12]
        && row.one_password_last_success_at === next[13]
        && row.one_password_last_error === next[14]
        && serializeJson(normalizeJsonValue(row.one_password_result)) === next[15]
}

function broadcast() {
    scoutEmitter.emit('update', getScout())
}

function createInitialState(): Scout {
    return {
        updatedAt: null,
        projectRoot: process.env.SCOUTERBEE_PROJECT_ROOT || DEFAULT_PROJECT_ROOT,
        projects: {
            enabled: true,
            intervalMinutes: 1,
            lastStartedAt: null,
            lastFinishedAt: null,
            lastSuccessAt: null,
            lastError: null,
            result: null
        },
        onePassword: {
            enabled: Boolean(process.env.ONEPASSWORD_TOKEN),
            intervalMinutes: 30,
            lastStartedAt: null,
            lastFinishedAt: null,
            lastSuccessAt: null,
            lastError: null,
            result: null
        }
    }
}
