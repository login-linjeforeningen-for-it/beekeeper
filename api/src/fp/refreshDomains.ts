import preloadDomains from '#utils/traffic/preloadDomains.ts'
import type { FastifyInstance } from 'fastify'

export default async function refreshDomains(fastify: FastifyInstance) {
    const domains = await preloadDomains()
    fastify.domains = Buffer.from(JSON.stringify(domains))
}
