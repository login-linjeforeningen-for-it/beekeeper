import type { FastifyReply, FastifyRequest } from 'fastify'
import proxyInternal, { buildInternalUrl, internalHeaders } from '#utils/proxyInternal.ts'

export async function getScout(req: FastifyRequest, reply: FastifyReply) {
    return proxyInternal(req, reply, { path: 'scout' })
}

export async function getScoutLive(req: FastifyRequest, reply: FastifyReply) {
    reply.sse.keepAlive()
    const controller = new AbortController()
    const cleanup = () => controller.abort()
    reply.sse.onClose(cleanup)

    try {
        let previousPayload = ''

        while (!controller.signal.aborted) {
            const response = await fetch(buildInternalUrl('scout', req.raw.url), {
                headers: internalHeaders()
            })

            const text = await response.text()
            if (!response.ok) {
                throw new Error(text || `Internal scout request failed with ${response.status}`)
            }

            if (text !== previousPayload) {
                const data = text ? JSON.parse(text) : null
                const event = previousPayload ? 'update' : 'snapshot'
                await reply.sse.send({ event, data })
                previousPayload = text
            }

            await new Promise((resolve) => setTimeout(resolve, 15000))
        }
    } catch (error) {
        if (error && (error as Error).name !== 'AbortError') {
            throw error
        }
    }
}
