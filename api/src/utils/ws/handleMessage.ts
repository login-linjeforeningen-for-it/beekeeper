import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'

export const beeswarm = new Map<string, Set<WS>>()
export const beeswarmSockets = new Map<WS, GPT_SocketState>()

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
        if (msg.type !== 'update') {
            console.log('HANDLING MESSAGE', msg.type, msg)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
            console.log('HANDLING MESSAGE', msg.type)
        }

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

function relayPromptRequest(id: string, requester: WS, request: GPT_PromptRequest) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

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

    targets[0].send(JSON.stringify(request))
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
    console.log('1 relayHistory')
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

    console.log('2 relayHistory')
    const target = [...clients].find((client) => {
        const state = beeswarmSockets.get(client)
        return state?.role === 'producer' && state.clientName === request.clientName
    })

    console.log('3 relayHistory')
    if (!target || target.readyState !== WS.OPEN) {
        console.log('3.1 relayHistory')
        requester.send(JSON.stringify({
            type: 'prompt_error',
            conversationId: request.conversationId,
            clientName: request.clientName,
            error: `Client ${request.clientName} is not connected.`,
            timestamp: new Date().toISOString(),
        }))
        return
    }

    console.log('4 relayHistory')
    console.log('sending history to', target, JSON.stringify({
        type: 'history_request',
        conversationId: request.conversationId,
        clientName: request.clientName,
    }))
    target.send(JSON.stringify({
        type: 'history_request',
        conversationId: request.conversationId,
        clientName: request.clientName,
    }))
}
