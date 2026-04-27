import config from '#constants'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import preloadInternalDashboard from '#utils/dashboard/internal/preloadInternalDashboard.ts'
import preloadDomains from '#utils/traffic/preloadDomains.ts'
import preloadMetrics from '#utils/traffic/preloadMetrics.ts'
import preloadStatus from '#utils/status/preloadStatus.ts'

export default fp(async (fastify) => {
    async function refresh() {
        await Promise.all([
            refreshInternalDashboard(fastify),
            refreshMonitoring(fastify),
            refreshDomains(fastify),
            refreshMetrics(fastify),
        ])
        fastify.log.info('Queries refreshed')
    }

    refresh()
    setInterval(refresh, config.cache.ttl)
})

async function refreshInternalDashboard(fastify: FastifyInstance) {
    const internalDashboard: InternalDashboard = await preloadInternalDashboard()
    fastify.internalDashboard = Buffer.from(JSON.stringify(internalDashboard))
}

async function refreshMonitoring(fastify: FastifyInstance) {
    const monitoring: Monitoring[] = await preloadStatus()
    fastify.monitoring = Buffer.from(JSON.stringify(monitoring))
}

async function refreshDomains(fastify: FastifyInstance) {
    const domains = await preloadDomains()
    fastify.domains = Buffer.from(JSON.stringify(domains))
}

async function refreshMetrics(fastify: FastifyInstance) {
    const metrics = await preloadMetrics()
    fastify.metrics = Buffer.from(JSON.stringify(metrics))
}
