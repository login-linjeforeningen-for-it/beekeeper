import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { createAiConversationShare } from '#utils/ai/conversations.ts'
import { setAiResponseHeaders } from './shared.ts'

export default async function postShareConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const shareToken = await createAiConversationShare(req.params.id, owner)

    if (!shareToken) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send({ shareToken })
}
