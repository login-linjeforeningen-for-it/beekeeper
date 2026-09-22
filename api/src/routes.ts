import type { FastifyInstance } from 'fastify'

import { preHandler } from '#utils/auth.ts'

import { getToken, getTokenBTG } from './handlers/login.ts'
import {
    getDomains,
    getLive,
    getMetrics,
    getRecords,
    postTraffic,
} from './handlers/traffic.ts'
import { getHealth, getIndex, getVersion } from './handlers/system.ts'
import {
    deleteStatus,
    deleteStatusNotification,
    deleteTag,
    getService,
    getStatus,
    getStatusNotifications,
    getTags,
    postService,
    postStatusNotification,
    postStatusUpdate,
    postTag,
    putService,
    putStatusNotification,
} from './handlers/monitoring.ts'

export default async function apiRoutes(fastify: FastifyInstance) {
    // index
    fastify.get('/', getIndex)
    fastify.get('/health', { logLevel: 'silent' }, getHealth)
    fastify.get('/version', getVersion)

    // token validation
    fastify.get('/token', getToken)
    fastify.get('/token/btg', getTokenBTG)

    // traffic logging
    fastify.get('/traffic/metrics', { preHandler }, getMetrics)
    fastify.get('/traffic/records', { preHandler }, getRecords)
    fastify.get('/traffic/domains', { preHandler }, getDomains)
    fastify.get('/traffic/live', { sse: true, preHandler }, getLive)
    fastify.post('/traffic', postTraffic)

    // status
    fastify.get('/monitoring', getStatus)
    fastify.get('/monitoring/:id', getService)
    fastify.get('/monitoring/notifications', getStatusNotifications)
    fastify.get('/monitoring/tags', getTags)

    fastify.post('/monitoring', { preHandler }, postService)
    fastify.post('/monitoring/:id', postStatusUpdate)
    fastify.post('/monitoring/notification', { preHandler }, postStatusNotification)
    fastify.post('/monitoring/tag', { preHandler }, postTag)

    fastify.put('/monitoring/:id', { preHandler }, putService)
    fastify.put('/monitoring/notification/:id', { preHandler }, putStatusNotification)

    fastify.delete('/monitoring/:id', { preHandler }, deleteStatus)
    fastify.delete('/monitoring/notification/:id', { preHandler }, deleteStatusNotification)
    fastify.delete('/monitoring/tag/:id', { preHandler }, deleteTag)
}
