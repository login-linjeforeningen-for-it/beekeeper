import { WebSocket as WS } from 'ws'
import { beeswarm } from './handleMessage.ts'

export function removeClient(id: string, socket: WS) {
    const clients = beeswarm.get(id)
    if (!clients) {
        return
    }

    clients.delete(socket)
    if (clients.size === 0) {
        beeswarm.delete(id)
    }
}
