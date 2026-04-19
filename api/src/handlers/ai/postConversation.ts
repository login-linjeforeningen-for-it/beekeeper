import type { FastifyReply, FastifyRequest } from 'fastify'
import { createAiConversation } from '#utils/ai/conversations.ts'
import { resolveAiOwner } from '#utils/ai/owner.ts'

type Body = {
    clientName?: string
}

export default async function postConversation(
    req: FastifyRequest<{ Body: Body }>,
    res: FastifyReply
) {
    const clientName = req.body?.clientName?.trim()
    const owner = await resolveAiOwner(req)

    if (!clientName) {
        res.code(400).type('application/json').send({ error: 'clientName is required.' })
        return
    }

    const conversation = await createAiConversation(clientName, owner)
    res.code(201).type('application/json').send(conversation)
}
