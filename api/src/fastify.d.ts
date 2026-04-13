import 'fastify'

declare module 'fastify' {
    interface FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> {
        websocketServer: WebSocket.Server
        injectWS: InjectWSFn<RawRequest>
        status: Buffer
        favicon: Buffer
        internalDashboard: Buffer
        clients: number
    }
}
