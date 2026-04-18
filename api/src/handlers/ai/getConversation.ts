import type { FastifyReply, FastifyRequest } from 'fastify'
import { getAiConversation } from '#utils/ai/conversations.ts'

export default async function getConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    const conversation = await getAiConversation(req.params.id)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}
