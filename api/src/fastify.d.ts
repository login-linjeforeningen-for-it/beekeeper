import 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        favicon: Buffer
    }
}
