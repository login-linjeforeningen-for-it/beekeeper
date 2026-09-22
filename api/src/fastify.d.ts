import 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        monitoring: Buffer
        refreshMonitoring: () => Promise<void>
        favicon: Buffer
        domains: Buffer
        metrics: Buffer
    }
}
