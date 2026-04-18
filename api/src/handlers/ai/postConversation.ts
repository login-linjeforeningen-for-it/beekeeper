import type { FastifyReply, FastifyRequest } from 'fastify'
import { createAiConversation } from '#utils/ai/conversations.ts'

type Body = {
    clientName?: string
}

export default async function postConversation(
    req: FastifyRequest<{ Body: Body }>,
    res: FastifyReply
) {
    const clientName = req.body?.clientName?.trim()

    if (!clientName) {
        res.code(400).type('application/json').send({ error: 'clientName is required.' })
        return
    }

    const conversation = await createAiConversation(clientName)
    res.code(201).type('application/json').send(conversation)
}
