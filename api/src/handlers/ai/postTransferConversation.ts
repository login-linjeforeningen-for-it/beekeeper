import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { transferAiConversationToUser } from '#utils/ai/conversations.ts'

type Body = {
    userId?: string
}

export default async function postTransferConversation(
    req: FastifyRequest<{ Params: { id: string }, Body: Body }>,
    res: FastifyReply
) {
    const owner = await resolveAiOwner(req)
    const nextUserId = req.body?.userId?.trim() || owner.userId

    if (!nextUserId) {
        res.code(400).type('application/json').send({ error: 'userId is required.' })
        return
    }

    const transferred = await transferAiConversationToUser(req.params.id, owner, nextUserId)
    if (!transferred) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.code(204).send()
}
