import cors from '@fastify/cors'
import Fastify from 'fastify'
import fs from 'fs'
import path from 'path'
import apiRoutes from './routes.ts'
import { installJsonConsoleLogger, log } from './utils/logs/jsonLogger.ts'

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

start()
