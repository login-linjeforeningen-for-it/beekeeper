import type { FastifyReply, FastifyRequest } from 'fastify'
import { getAiConversation } from '#utils/ai/conversations.ts'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { setAiResponseHeaders } from './shared.ts'

export default async function getConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const conversation = await getAiConversation(req.params.id, owner)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}
