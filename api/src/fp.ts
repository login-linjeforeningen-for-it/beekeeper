import config from '#constants'
import fp from 'fastify-plugin'
import refreshInternalDashboard from './fp/refreshInternalDashboard.ts'

export default fp(async (fastify) => {
    async function refresh() {
        refreshInternalDashboard(fastify)
        fastify.log.info('Queries refreshed')
    }

    refresh()
    setInterval(refresh, config.cache.ttl)
})
