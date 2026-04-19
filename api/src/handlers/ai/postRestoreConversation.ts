import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { restoreAiConversation } from '#utils/ai/conversations.ts'

export default async function postRestoreConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    const owner = await resolveAiOwner(req)
    const restored = await restoreAiConversation(req.params.id, owner)

    if (!restored) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.code(204).send()
}
