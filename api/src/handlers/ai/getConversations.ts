import type { FastifyReply, FastifyRequest } from 'fastify'
import { listAiConversations } from '#utils/ai/conversations.ts'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { setAiResponseHeaders } from './shared.ts'

export default async function getConversations(
    req: FastifyRequest<{ Querystring: { deleted?: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const conversations = await listAiConversations(owner, {
        deleted: req.query.deleted === 'true'
    })
    res.type('application/json').send(conversations)
}
