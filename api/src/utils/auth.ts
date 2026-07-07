import type { FastifyReply, FastifyRequest } from 'fastify'
import config from '#constants'

const { USERINFO_URL, BTG_TOKEN } = config

type UserInfo = {
    sub: string
    name: string
    email: string
    groups: string[]
}

declare module 'fastify' {
    interface FastifyRequest {
        user?: UserInfo
    }
}

const MAX_CACHE_SIZE = 500
const CACHE_TTL = 60_000
const NEGATIVE_CACHE_TTL = 10_000

type CacheEntry = { valid: boolean; userInfo?: UserInfo; expiresAt: number }
const tokenCache = new Map<string, CacheEntry>()

function cacheSet(token: string, entry: CacheEntry) {
    if (tokenCache.has(token)) tokenCache.delete(token)
    if (tokenCache.size >= MAX_CACHE_SIZE) {
        const oldest = tokenCache.keys().next().value
        if (oldest !== undefined) tokenCache.delete(oldest)
    }
    tokenCache.set(token, entry)
}

export async function checkToken(token: string): Promise<{ valid: boolean; userInfo?: UserInfo; error?: string }> {
    const cached = tokenCache.get(token)
    if (cached && cached.expiresAt > Date.now()) {
        return cached
    }

    try {
        const res = await fetch(USERINFO_URL, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) {
            const entry = { valid: false, error: 'Unauthorized', expiresAt: Date.now() + NEGATIVE_CACHE_TTL }
            cacheSet(token, entry)
            return entry
        }

        const data = await res.json() as Record<string, unknown>
        const groups = Array.isArray(data.groups) ? data.groups as string[] : []

        if (!groups.includes('TekKom') && !groups.includes('queenbee')) {
            const entry = { valid: false, error: 'Unauthorized', expiresAt: Date.now() + NEGATIVE_CACHE_TTL }
            cacheSet(token, entry)
            return entry
        }

        const userInfo: UserInfo = {
            sub: data.sub as string,
            name: data.name as string,
            email: data.email as string,
            groups,
        }
        const entry = { valid: true, userInfo, expiresAt: Date.now() + CACHE_TTL }
        cacheSet(token, entry)
        return entry
    } catch {
        return { valid: false, error: 'Internal server error' }
    }
}

export async function preHandler(req: FastifyRequest, res: FastifyReply) {
    const authHeader = req.headers['authorization']
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null

    if (!token) {
        return res.status(401).send({ error: 'Missing or invalid Authorization header' })
    }

    const result = await checkToken(token)
    if (!result.valid || !result.userInfo) {
        return res.status(401).send({ error: result.error ?? 'Unauthorized' })
    }

    req.user = result.userInfo
}

export async function tokenWrapper(req: FastifyRequest, res: FastifyReply): Promise<{ valid: boolean; error?: string }> {
    const authHeader = req.headers['authorization']
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null

    if (!token) {
        return { valid: false, error: 'Missing or invalid Authorization header' }
    }

    // BTG fallback: static token used when Authentik is unavailable
    if (token === BTG_TOKEN) {
        return { valid: true }
    }

    try {
        const result = await checkToken(token)
        if (!result.valid) {
            return { valid: false, error: result.error }
        }
        return { valid: true }
    } catch {
        res.status(500)
        return { valid: false, error: 'Internal server error' }
    }
}

