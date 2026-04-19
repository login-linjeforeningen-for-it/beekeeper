import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { copySharedAiConversation } from '#utils/ai/conversations.ts'

export default async function postCopySharedConversation(
    req: FastifyRequest<{ Params: { token: string } }>,
    res: FastifyReply
) {
    const owner = await resolveAiOwner(req)
    const conversation = await copySharedAiConversation(req.params.token, owner)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Shared conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}
