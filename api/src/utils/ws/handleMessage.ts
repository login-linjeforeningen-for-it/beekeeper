import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'
import {
    canOwnerAccessConversation,
    persistAssistantResponse,
    persistUserPrompt
} from '#utils/ai/conversations.ts'

export const beeswarm = new Map<string, Set<WS>>()
export const beeswarmSockets = new Map<WS, GPT_SocketState>()
const CHAT_BEHAVIOR_SYSTEM_PROMPT = [
    'You are the Login AI assistant.',
    'Prefer replying in English by default.',
    "If the majority of the user's message is in Norwegian, reply in Norwegian.",
    'Only reply in Chinese if the user clearly asks for Chinese.',
    'If the user switches language, follow the same rule again for the newest user message.',
    'Be concise, natural, and helpful.'
].join(' ')

function defaultModelMetrics(): GPT_ModelMetrics {
    return {
        conversationId: null,
        status: 'idle',
        currentTokens: 0,
        maxTokens: 0,
        promptTokens: 0,
        generatedTokens: 0,
        contextTokens: 0,
        contextMaxTokens: 0,
        tps: 0,
        lastUpdated: null,
        lastError: null,
    }
}

function normalizeClient(client: GPT_Client): GPT_Client {
    return {
        ...client,
        model: {
            ...defaultModelMetrics(),
            ...(client.model || {}),
        },
    }
}

export async function handleMessage(id: string, socket: WS, rawMessage: RawData) {
    try {
        const msg = JSON.parse(rawMessage.toString()) as { type?: string, client?: GPT_Client }
        switch (msg.type) {
            case 'update':
                if (!msg.client) {
                    return
                }

                const normalizedClient = normalizeClient(msg.client)

                beeswarmSockets.set(socket, {
                    role: 'producer',
                    clientName: normalizedClient.name,
                })
                broadcastUpdate(id, socket, normalizedClient)
                return

            case 'prompt_request':
                relayPromptRequest(id, socket, msg as GPT_PromptRequest)
                return

            case 'prompt_started':
            case 'prompt_delta':
            case 'prompt_complete':
            case 'prompt_error':
                broadcastPromptEvent(id, socket, msg)
                return

            case 'history_request':
                relayHistoryRequest(
                    id,
                    socket,
                    msg as {
                        clientName: string
                        conversationId: string
                    }
                )
                return

            case 'history_provided':
                broadcastPromptEvent(id, socket, msg)
                return

            default: return
        }
    } catch (err) {
        console.error('Invalid WebSocket message:', err)
    }
}

async function relayPromptRequest(id: string, requester: WS, request: GPT_PromptRequest) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

    const owner = {
        userId: request.ownerUserId || null,
        sessionId: request.ownerSessionId || null,
    }

    if (!(await canOwnerAccessConversation(request.conversationId, owner))) {
        requester.send(JSON.stringify({
            type: 'prompt_error',
            conversationId: request.conversationId,
            clientName: request.clientName || null,
            error: 'You do not have access to this conversation.',
            timestamp: new Date().toISOString(),
        }))
        return
    }

    const latestUserMessage = [...request.messages]
        .reverse()
        .find((message) => message.role === 'user' && message.content.trim())

    const targets = [...clients].filter((client) => {
        if (client === requester || client.readyState !== WS.OPEN) {
            return false
        }

        const state = beeswarmSockets.get(client)
        if (!state || state.role !== 'producer') {
            return false
        }

        return !request.clientName || state.clientName === request.clientName
    })

    if (!targets.length) {
        if (latestUserMessage) {
            persistUserPrompt(request.conversationId, latestUserMessage.content, request.clientName || null)
        }

        persistAssistantResponse({
            conversationId: request.conversationId,
            clientName: request.clientName || null,
            content: request.clientName
                ? `Client ${request.clientName} is not connected.`
                : 'No model client is connected.',
            error: true,
        })

        requester.send(JSON.stringify({
            type: 'prompt_error',
            conversationId: request.conversationId,
            clientName: request.clientName || null,
            error: request.clientName
                ? `Client ${request.clientName} is not connected.`
                : 'No model client is connected.',
            timestamp: new Date().toISOString(),
        }))
        return
    }

    if (latestUserMessage) {
        persistUserPrompt(request.conversationId, latestUserMessage.content, request.clientName || null)
    }

    targets[0].send(JSON.stringify({
        ...request,
        messages: withChatBehaviorSystemPrompt(request.messages),
    }))
}

function broadcastUpdate(id: string, sender: WS, client: GPT_Client) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

    const payload = JSON.stringify({
        type: 'update',
        client,
        timestamp: new Date().toISOString(),
        participants: clients.size
    })

    for (const clientSocket of clients) {
        if (clientSocket !== sender && clientSocket.readyState === WS.OPEN) {
            clientSocket.send(payload)
        }
    }
}

function broadcastPromptEvent(id: string, sender: WS, event: { type?: string }) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

    if (event.type === 'prompt_complete' && 'conversationId' in event && 'content' in event) {
        persistAssistantResponse({
            conversationId: String(event.conversationId || ''),
            clientName: 'clientName' in event ? String(event.clientName || '') || null : null,
            content: String(event.content || ''),
        })
    }

    if (event.type === 'prompt_error' && 'conversationId' in event) {
        persistAssistantResponse({
            conversationId: String(event.conversationId || ''),
            clientName: 'clientName' in event ? String(event.clientName || '') || null : null,
            content: String(('error' in event && event.error) || 'The model failed to answer this prompt.'),
            error: true,
        })
    }

    const payload = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
    })

    for (const clientSocket of clients) {
        if (clientSocket !== sender && clientSocket.readyState === WS.OPEN) {
            clientSocket.send(payload)
        }
    }
}

function relayHistoryRequest(
    id: string,
    requester: WS,
    request: { clientName: string; conversationId: string }
) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

    let foundProducer = false

    for (const client of clients) {
        if (client === requester || client.readyState !== WS.OPEN) {
            continue
        }

        const state = beeswarmSockets.get(client)
        if (state?.role !== 'producer') {
            continue
        }

        foundProducer = true


    }

    const target = [...clients].find((client) => {
        const state = beeswarmSockets.get(client)
        return state?.role === 'producer' && state.clientName === request.clientName
    })

    if (!target || target.readyState !== WS.OPEN) {
        requester.send(JSON.stringify({
            type: 'prompt_error',
            conversationId: request.conversationId,
            clientName: request.clientName,
            error: `Client ${request.clientName} is not connected.`,
            timestamp: new Date().toISOString(),
        }))
        return
    }

    target.send(JSON.stringify({
        type: 'history_request',
        conversationId: request.conversationId,
        clientName: request.clientName,
    }))
}

function withChatBehaviorSystemPrompt(messages: GPT_ChatMessage[]) {
    if (messages.some((message) =>
        message.role === 'system'
        && message.content === CHAT_BEHAVIOR_SYSTEM_PROMPT)) {
        return messages
    }

    return [
        {
            role: 'system',
            content: CHAT_BEHAVIOR_SYSTEM_PROMPT,
        },
        ...messages,
    ]
}
