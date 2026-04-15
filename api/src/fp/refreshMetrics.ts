import preloadMetrics from '#utils/traffic/preloadMetrics.ts'
import type { FastifyInstance } from 'fastify'

export default async function refreshMetrics(fastify: FastifyInstance) {
    const metrics = await preloadMetrics()
    fastify.metrics = Buffer.from(JSON.stringify(metrics))
}
