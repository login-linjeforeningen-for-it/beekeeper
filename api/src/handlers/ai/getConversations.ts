import type { FastifyReply, FastifyRequest } from 'fastify'
import { listAiConversations } from '#utils/ai/conversations.ts'

export default async function getConversations(
    _: FastifyRequest,
    res: FastifyReply
) {
    const conversations = await listAiConversations()
    res.type('application/json').send(conversations)
}
