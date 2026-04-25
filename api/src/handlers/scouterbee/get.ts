import type { FastifyReply, FastifyRequest } from 'fastify'
import { ensureScout, getScout as getScoutState } from '#utils/scouterbee/state.ts'

export default async function getScout(_req: FastifyRequest, reply: FastifyReply) {
    await ensureScout()
    return reply.send(getScoutState())
}
