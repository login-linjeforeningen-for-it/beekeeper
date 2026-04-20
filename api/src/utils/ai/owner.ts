import type { FastifyRequest } from 'fastify'
import config from '#constants'

const TOKEN_CACHE_TTL_MS = 1000 * 60 * 5
const tokenOwnerCache = new Map<string, { userId: string | null, expiresAt: number }>()

export async function resolveAiOwner(req: FastifyRequest): Promise<AiConversationOwner> {
    const sessionId = normalizeHeaderValue(req.headers['x-ai-session-id'])
    const authHeader = normalizeHeaderValue(req.headers.authorization)

    if (!authHeader?.startsWith('Bearer ')) {
        return {
            userId: null,
            sessionId,
        }
    }

    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) {
        return {
            userId: null,
            sessionId,
        }
    }

    const cachedUserId = getCachedUserId(token)
    if (cachedUserId !== undefined) {
        return {
            userId: cachedUserId,
            sessionId,
        }
    }

    try {
        const response = await fetch(config.USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            cacheUserId(token, null)
            return {
                userId: null,
                sessionId,
            }
        }

        const userInfo = await response.json() as { sub?: string }
        cacheUserId(token, userInfo.sub || null)
        return {
            userId: userInfo.sub || null,
            sessionId,
        }
    } catch {
        cacheUserId(token, null)
        return {
            userId: null,
            sessionId,
        }
    }
}

function normalizeHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] || null : value || null
}

function getCachedUserId(token: string) {
    const cached = tokenOwnerCache.get(token)
    if (!cached) {
        return undefined
    }

    if (cached.expiresAt <= Date.now()) {
        tokenOwnerCache.delete(token)
        return undefined
    }

    return cached.userId
}

function cacheUserId(token: string, userId: string | null) {
    tokenOwnerCache.set(token, {
        userId,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    })

    if (tokenOwnerCache.size > 5000) {
        const now = Date.now()
        for (const [cacheKey, cached] of tokenOwnerCache) {
            if (cached.expiresAt <= now) {
                tokenOwnerCache.delete(cacheKey)
            }
        }
    }
}
