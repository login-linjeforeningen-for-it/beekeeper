import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { registerClient } from '#utils/ws/registerClient.ts'
import { handleMessage } from '#utils/ws/handleMessage.ts'
import { removeClient } from '#utils/ws/removeClient.ts'
import { beeswarm } from '#utils/ws/handleMessage.ts'

export default fp(async function wsPlugin(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>('/api/client/ws/:id', { websocket: true }, (connection: WebSocket, req: FastifyRequest<{ Params: { id: string } }>) => {
        const id = (req.params as { id: string}).id

        registerClient(id, connection)
        fastify.clients = beeswarm.get(id)!.size

        connection.on('message', (message) => {
            console.log('CONNECTION INTERACTION', connection, message)
            handleMessage(id, connection, message)
        })

        connection.on('close', () => {
            fastify.clients = beeswarm.size
            removeClient(id, connection)
        })
    })
})
