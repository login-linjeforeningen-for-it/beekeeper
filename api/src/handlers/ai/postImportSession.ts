import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveAiOwner } from '#utils/ai/owner.ts'
import { importAiConversationsFromSession } from '#utils/ai/conversations.ts'

type Body = {
    sessionId?: string
}

export default async function postImportSession(
    req: FastifyRequest<{ Body: Body }>,
    res: FastifyReply
) {
    const owner = await resolveAiOwner(req)
    const sessionId = req.body?.sessionId?.trim()

    if (!owner.userId) {
        res.code(401).type('application/json').send({ error: 'Login required.' })
        return
    }

    if (!sessionId) {
        res.code(400).type('application/json').send({ error: 'sessionId is required.' })
        return
    }

    await importAiConversationsFromSession(owner.userId, sessionId)
    res.code(204).send()
}
