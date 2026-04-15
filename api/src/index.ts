import cors from '@fastify/cors'
import sse from '@fastify/sse'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'
import fs from 'fs'
import path from 'path'
import apiRoutes from './routes.ts'
import cron from '#utils/cron.ts'
import fp from './fp.ts'
import ws from './plugins/ws.ts'

import getIndexHandler from './handlers/index/getIndex.ts'
import getFavicon from './handlers/favicon/getFavicon.ts'

const port = Number(process.env.PORT) || 8080
const fastify = Fastify({
    logger: true
})

fastify.decorate('favicon', fs.readFileSync(path.join(process.cwd(), 'public', 'favicon.ico')))
fastify.decorate('internalDashboard', Buffer.from(''))
fastify.decorate('clients', 0)
fastify.decorate('domains', Buffer.from(JSON.stringify({ domains: [] })))
fastify.decorate('metrics', Buffer.from(JSON.stringify({
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
})))

fastify.register(websocket)
fastify.register(sse)
fastify.register(ws)
fastify.register(fp)
fastify.register(apiRoutes, { prefix: '/api' })
fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
})

fastify.get('/', getIndexHandler)
fastify.get('/favicon.ico', getFavicon)

async function start() {
    try {
        await fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

cron()
start()
