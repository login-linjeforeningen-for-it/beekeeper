import type { FastifyRequest } from 'fastify'
import config from '#constants'

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

    try {
        const response = await fetch(config.USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            return {
                userId: null,
                sessionId,
            }
        }

        const userInfo = await response.json() as { sub?: string }
        return {
            userId: userInfo.sub || null,
            sessionId,
        }
    } catch {
        return {
            userId: null,
            sessionId,
        }
    }
}

function normalizeHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] || null : value || null
}
