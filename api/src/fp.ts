import config from '#constants'
import fp from 'fastify-plugin'
import refreshInternalDashboard from './fp/refreshInternalDashboard.ts'
import refreshMonitoring from './fp/refreshStatus.ts'
import refreshDomains from './fp/refreshDomains.ts'
import refreshMetrics from './fp/refreshMetrics.ts'

export default fp(async (fastify) => {
    async function refresh() {
        refreshInternalDashboard(fastify)
        refreshMonitoring(fastify)
        refreshDomains(fastify)
        refreshMetrics(fastify)
        fastify.log.info('Queries refreshed')
    }

    refresh()
    setInterval(refresh, config.cache.ttl)
})
