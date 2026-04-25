import 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        websocketServer: WebSocket.Server
        injectWS: InjectWSFn
        monitoring: Buffer
        favicon: Buffer
        internalDashboard: Buffer
        domains: Buffer
        metrics: Buffer
        clients: number
        scout: Scout
    }
}
