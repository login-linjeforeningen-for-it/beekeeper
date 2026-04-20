import type { FastifyReply, FastifyRequest } from 'fastify'
import { switchAiConversationClient } from '#utils/ai/conversations.ts'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { setAiResponseHeaders } from './shared.ts'

type Body = {
    clientName?: string
}

export default async function postSwitchConversationClient(
    req: FastifyRequest<{ Params: { id: string }, Body: Body }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const clientName = req.body?.clientName?.trim()
    const owner = await resolveAiOwner(req)

    if (!clientName) {
        res.code(400).type('application/json').send({ error: 'clientName is required.' })
        return
    }

    const conversation = await switchAiConversationClient(req.params.id, clientName, owner)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}
