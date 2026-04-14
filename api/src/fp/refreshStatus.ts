import preloadStatus from '#utils/status/preloadStatus.ts'
import type { FastifyInstance } from 'fastify'

export default async function refreshMonitoring(fastify: FastifyInstance) {
    const monitoring: Monitoring[] = await preloadStatus()
    fastify.monitoring = Buffer.from(JSON.stringify(monitoring))
}
