import type { FastifyReply, FastifyRequest } from 'fastify'
import { deleteAiConversation } from '#utils/ai/conversations.ts'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { setAiResponseHeaders } from './shared.ts'

export default async function deleteConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const deleted = await deleteAiConversation(req.params.id, owner)

    if (!deleted) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.code(204).send()
}
