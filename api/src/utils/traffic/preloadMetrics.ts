import run from '#db'
import { loadSQL } from '#utils/query/loadSQL.ts'

export default async function preloadMetrics() {
    try {
        const query = await loadSQL('fetchDefaultMetrics.sql')
        const result = await run(query)

        return result.rows[0]
    } catch (error) {
        console.log(error)
        return {
            total_requests: "0",
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
