import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { setAiResponseHeaders } from './shared.ts'

export default async function getClients(
    this: FastifyInstance,
    _: FastifyRequest,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    res.type('application/json').send(this.clients)
}
