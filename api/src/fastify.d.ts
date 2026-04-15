import 'fastify'

declare module 'fastify' {
    interface FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> {
        websocketServer: WebSocket.Server
        injectWS: InjectWSFn<RawRequest>
        monitoring: Buffer
        favicon: Buffer
        internalDashboard: Buffer
        domains: Buffer
        clients: number
    }
}
