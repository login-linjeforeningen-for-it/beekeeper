import config from '#constants'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import run, { loadSQL } from '#db'
import { preloadInternalDashboard } from '#utils/dashboard/internal/sources.ts'
import { preloadStatus } from '#utils/status/monitor.ts'

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
