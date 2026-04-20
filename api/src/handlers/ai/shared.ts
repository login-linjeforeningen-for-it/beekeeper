import type { FastifyReply } from 'fastify'

export function setAiResponseHeaders(res: FastifyReply) {
    res.header('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
}
