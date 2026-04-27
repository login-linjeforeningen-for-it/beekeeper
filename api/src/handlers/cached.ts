import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export async function getInternalDashboard(
    this: FastifyInstance,
    _: FastifyRequest,
    res: FastifyReply
) {
    res.type('application/json').send(this.internalDashboard)
}

export async function getFavicon(
    this: FastifyInstance,
    _req: FastifyRequest,
    res: FastifyReply
) {
    res.type('image/x-icon').send(this.favicon)
}
