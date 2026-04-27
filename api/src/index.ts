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
import { installJsonConsoleLogger, log } from './utils/logs/jsonLogger.ts'

import { getIndex as getIndexHandler } from './handlers/index.ts'
import { getFavicon } from './handlers/cached.ts'

const port = Number(process.env.PORT) || 8080

installJsonConsoleLogger()

const fastify = Fastify({
    logger: {
        level: process.env.LOG_LEVEL ?? 'info',
        base: {
            service: 'beekeeper_api',
            runtime: 'api',
            environment: process.env.NODE_ENV ?? 'development',
        },
        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers.x-auth-request-access-token',
                'req.headers.x-auth-request-token',
            ],
            censor: '[REDACTED]'
        },
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        formatters: {
            level(label) {
                return { level: label }
            }
        }
    }
})

fastify.decorate('favicon', fs.readFileSync(path.join(process.cwd(), 'public', 'favicon.ico')))
fastify.decorate('internalDashboard', Buffer.from(''))
fastify.decorate('clients', 0)
fastify.decorate('domains', Buffer.from(JSON.stringify({ domains: [] })))
fastify.decorate('metrics', Buffer.from(JSON.stringify({
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
        log('info', 'Beekeeper API started', {
            event: 'api.started',
            port,
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

cron()
start()
