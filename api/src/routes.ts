import type { FastifyInstance } from 'fastify'

import { getToken } from './handlers/login.ts'
import { getHealth, getIndex, getVersion } from './handlers/system.ts'

export default async function apiRoutes(fastify: FastifyInstance) {
    // index
    fastify.get('/', getIndex)
    fastify.get('/health', { logLevel: 'silent' }, getHealth)
    fastify.get('/version', getVersion)

    // token validation
    fastify.get('/token', getToken)
}
