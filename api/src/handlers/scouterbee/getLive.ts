import type { FastifyReply, FastifyRequest } from 'fastify'
import { on } from 'events'
import scoutEmitter from '#utils/scouterbee/emitter.ts'
import { ensureScout, getScout } from '#utils/scouterbee/state.ts'

export default async function getScoutLive(_req: FastifyRequest, reply: FastifyReply) {
    await ensureScout()
    reply.sse.keepAlive()
    await reply.sse.send({ event: 'snapshot', data: getScout() })

    const controller = new AbortController()
    const cleanup = () => controller.abort()
    reply.sse.onClose(cleanup)

    try {
        for await (const [state] of on(scoutEmitter, 'update', { signal: controller.signal })) {
            await reply.sse.send({ event: 'update', data: state })
        }
    } catch (error) {
        if (error && (error as Error).name !== 'AbortError') {
            throw error
        }
    }
}
