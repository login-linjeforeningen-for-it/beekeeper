import config from '#constants'
import fp from 'fastify-plugin'
import run, { loadSQL } from '#db'
import { preloadInternalDashboard } from '#utils/dashboard/internal/sources.ts'
import { preloadStatus } from '#utils/status/monitor.ts'

export default fp(async (fastify) => {
    async function refresh() {
        const [internalDashboard, monitoring, domains, metrics] = await Promise.all([
            preloadInternalDashboard(),
            preloadStatus(),
            preloadDomains(),
            preloadMetrics(),
        ])

        fastify.internalDashboard = Buffer.from(JSON.stringify(internalDashboard))
        fastify.monitoring = Buffer.from(JSON.stringify(monitoring))
        fastify.domains = Buffer.from(JSON.stringify(domains))
        fastify.metrics = Buffer.from(JSON.stringify(metrics))
        fastify.log.info('Queries refreshed')
    }

    refresh()
    setInterval(refresh, config.cache.ttl)
})

async function preloadDomains() {
    try {
        const result = await run('SELECT DISTINCT domain FROM traffic ORDER BY domain')
        return result.rows.map(row => row.domain)
    } catch (error) {
        console.log(error)
        return []
    }
}

async function preloadMetrics() {
    try {
        const query = await loadSQL('fetchDefaultMetrics.sql')
        const result = await run(query)

        return result.rows[0]
    } catch (error) {
        console.log(error)
        return {
            total_requests: '0',
            avg_request_time: 0,
            error_rate: 0,
            top_status_codes: [],
            top_methods: [],
            top_domains: [],
            top_paths: [],
            top_slow_paths: [],
            top_error_paths: [],
            top_os: [],
            top_browsers: [],
            requests_over_time: []
        }
    }
}
