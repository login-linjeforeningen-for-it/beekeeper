import cors from '@fastify/cors'
import sse from '@fastify/sse'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'
import fs from 'fs'
import path from 'path'
import config from '#constants'
import apiRoutes from './routes.ts'
import fp from './fp.ts'
import ws from './utils/ws/handleMessage.ts'
import { installJsonConsoleLogger, log } from './utils/logs/jsonLogger.ts'
import monitor from './utils/status/monitor.ts'
import run from '#db'
import debug from './utils/debug.ts'

import { getFavicon, getIndex as getIndexHandler } from './handlers/system.ts'

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

startCron()
start()

function startCron() {
    setTimeout(() => {
        checkMaxConnections()
    }, 5000)

    setInterval(async() => {
        monitor()
    }, 60000)
}

async function checkMaxConnections() {
    try {
        const result = await run('SELECT count(*) FROM pg_stat_activity WHERE state=\'active\';')
        const active = Number(result.rows[0]?.count) || 0
        const maxRes = await run('SHOW max_connections;')
        const maxConnections = Number(maxRes.rows[0]?.max_connections) || 0
        const threshold = Math.floor(maxConnections / 2)
        const severeThreshold = (maxConnections / 10) * 9

        if (active > threshold && config.WEBHOOK_URL) {
            console.warn(`Active connections ${active} > ${threshold}, sending Discord alert...`)

            const data: { content?: string; embeds: object[] } = {
                embeds: [
                    {
                        title: '🐝 BeeKeeper Database Max Connections 🐝',
                        description: `🐝 Many connections detected: ${active.toFixed(2)}/${threshold}.`,
                        color: 0xff0000,
                        timestamp: new Date().toISOString()
                    }
                ]
            }

            if (active > severeThreshold) {
                data.content = `🚨 <@&${config.CRITICAL_DEVELOPMENT_ROLE}> 🚨`
            }

            await fetch(config.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
        } else {
            debug({ basic: `Active connections: ${active}` })
        }
    } catch (error) {
        debug({ basic: `checkMaxConnections error: ${error}` })
    }
}
