import type { FastifyReply, FastifyRequest } from 'fastify'
import proxyInternal from '#utils/proxyInternal.ts'

export default async function getScout(req: FastifyRequest, reply: FastifyReply) {
    return proxyInternal(req, reply, { path: 'scout' })
}
