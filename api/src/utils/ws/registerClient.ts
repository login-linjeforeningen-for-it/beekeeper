import { WebSocket } from 'ws'
import { beeswarm } from './handleMessage.ts'
import { WebSocket as WS } from 'ws'

export function registerClient(id: string, socket: WebSocket) {
    if (!beeswarm.has(id)) {
        beeswarm.set(id, new Set())
    }

    beeswarm.get(id)!.add(socket)
    broadcastJoin(id)
}

function broadcastJoin(id: string) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

    const payload = JSON.stringify({
        type: 'join',
        timestamp: new Date().toISOString(),
        participants: clients.size
    })

    for (const client of clients) {
        if (client.readyState === WS.OPEN) {
            client.send(payload)
        }
    }
}
