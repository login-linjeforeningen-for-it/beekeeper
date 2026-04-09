import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'

export const beeswarm = new Map<string, Set<WS>>()
export const pendingUpdates = new Map<string, { content: string; timer: NodeJS.Timeout }>()

export async function handleMessage(
    id: string,
    socket: WS,
    rawMessage: RawData,
) {
    try {
        const msg = JSON.parse(rawMessage.toString())
        if (msg.type !== 'update') {
            return
        }

        broadcastUpdate(id, socket, msg.client)
    } catch (err) {
        console.error('Invalid WebSocket message:', err)
    }
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

    for (const client of clients) {
        if (client !== sender && client.readyState === WS.OPEN) {
            client.send(payload)
        }
    }
}
