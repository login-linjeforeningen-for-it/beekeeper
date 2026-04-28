import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
    copySharedConversation as copyShared,
    createAiConversation,
    deleteAiConversation,
    getAiConversation,
    importSession as importOwnerSession,
    listAiConversations,
    restoreAiConversation,
    shareConversation as createShare,
    switchClient as switchConversationClient,
    transferConversation as transferToUser,
} from '#utils/ai/conversations.ts'
import { resolveAiOwner } from '#utils/ai/owner.ts'

type ClientBody = {
    clientName?: string
}

type ImportSessionBody = {
    sessionId?: string
}

type TransferBody = {
    userId?: string
}

export async function getClients(
    this: FastifyInstance,
    _: FastifyRequest,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    res.type('application/json').send(this.clients)
}

export async function getConversations(
    req: FastifyRequest<{ Querystring: { deleted?: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const conversations = await listAiConversations(owner, {
        deleted: req.query.deleted === 'true'
    })
    res.type('application/json').send(conversations)
}

export async function getConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const conversation = await getAiConversation(req.params.id, owner)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}

export async function postConversation(
    req: FastifyRequest<{ Body: ClientBody }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const clientName = req.body?.clientName?.trim()
    const owner = await resolveAiOwner(req)

    if (!clientName) {
        res.code(400).type('application/json').send({ error: 'clientName is required.' })
        return
    }

    const conversation = await createAiConversation(clientName, owner)
    res.code(201).type('application/json').send(conversation)
}

export async function switchClient(
    req: FastifyRequest<{ Params: { id: string }, Body: ClientBody }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const clientName = req.body?.clientName?.trim()
    const owner = await resolveAiOwner(req)

    if (!clientName) {
        res.code(400).type('application/json').send({ error: 'clientName is required.' })
        return
    }

    const conversation = await switchConversationClient(req.params.id, clientName, owner)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}

export async function deleteConversation(
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

export async function restoreConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const restored = await restoreAiConversation(req.params.id, owner)

    if (!restored) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.code(204).send()
}

export async function importSession(
    req: FastifyRequest<{ Body: ImportSessionBody }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
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

    await importOwnerSession(owner.userId, sessionId)
    res.code(204).send()
}

export async function transferConversation(
    req: FastifyRequest<{ Params: { id: string }, Body: TransferBody }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const nextUserId = req.body?.userId?.trim() || owner.userId

    if (!nextUserId) {
        res.code(400).type('application/json').send({ error: 'userId is required.' })
        return
    }

    const transferred = await transferToUser(req.params.id, owner, nextUserId)
    if (!transferred) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.code(204).send()
}

export async function shareConversation(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const shareToken = await createShare(req.params.id, owner)

    if (!shareToken) {
        res.code(404).type('application/json').send({ error: 'Conversation not found.' })
        return
    }

    res.type('application/json').send({ shareToken })
}

export async function copySharedConversation(
    req: FastifyRequest<{ Params: { token: string } }>,
    res: FastifyReply
) {
    setAiResponseHeaders(res)
    const owner = await resolveAiOwner(req)
    const conversation = await copyShared(req.params.token, owner)

    if (!conversation) {
        res.code(404).type('application/json').send({ error: 'Shared conversation not found.' })
        return
    }

    res.type('application/json').send(conversation)
}

function setAiResponseHeaders(res: FastifyReply) {
    res.header('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
}
