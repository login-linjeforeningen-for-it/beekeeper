import type { FastifyReply, FastifyRequest } from 'fastify'
import { deleteAiConversation } from '#utils/ai/conversations.ts'

export default async function deleteConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    const deleted = await deleteAiConversation(req.params.id)

    if (!deleted) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.code(204).send()
}
