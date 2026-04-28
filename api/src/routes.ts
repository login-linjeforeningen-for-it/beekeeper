import type { FastifyInstance } from 'fastify'

import { preHandler } from '#utils/auth.ts'

import { getUser, getUsers } from './handlers/users.ts'
import { getCallback, getLogin, getToken, getTokenBTG } from './handlers/login.ts'
import {
    getDomains,
    getLive,
    getMetrics,
    getRecords,
    postTraffic,
} from './handlers/traffic.ts'
import { getScout, getScoutLive } from './handlers/scouterbee.ts'
import { getHealth, getIndex, getInternalDashboard, getVersion } from './handlers/system.ts'
import {
    deleteSite,
    getPrimarySite,
    getSites,
    postSite,
    putSite,
    setPrimarySite,
} from './handlers/loadbalancing/sites.ts'
import {
    deleteConversation,
    getClients,
    getConversation,
    getConversations,
    postConversation,
    postCopySharedConversation,
    postImportSession,
    postRestoreConversation,
    postShareConversation,
    postSwitchConversationClient,
    postTransferConversation,
} from './handlers/ai.ts'
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
import {
    getInternalBackup,
    getInternalBackupFiles,
    getInternalDb,
    getInternalDeployment,
    getInternalDocker,
    getInternalDockerContainer,
    getInternalDockerLogs,
    getInternalIngress,
    getInternalStats,
    getInternalVulnerabilities,
    postInternalBackup,
    postInternalBackupRestore,
    postInternalDeploymentRun,
    postInternalVulnerabilityScan,
    putInternalDeploymentAuto,
} from './handlers/internal/proxy.ts'

export default async function apiRoutes(fastify: FastifyInstance) {
    // index
    fastify.get('/', getIndex)
    fastify.get('/health', { logLevel: 'silent' }, getHealth)
    fastify.get('/version', getVersion)

    // user
    fastify.get('/user/:email', getUser)
    fastify.get('/users', getUsers)
    fastify.get('/token', getToken)
    fastify.get('/token/btg', getTokenBTG)

    // login
    fastify.get('/login', getLogin)
    fastify.get('/callback', getCallback)

    // traffic logging
    fastify.get('/traffic/metrics', { preHandler }, getMetrics)
    fastify.get('/traffic/records', { preHandler }, getRecords)
    fastify.get('/traffic/domains', { preHandler }, getDomains)
    fastify.get('/traffic/live', { sse: true, preHandler }, getLive)
    fastify.post('/traffic', postTraffic)
    fastify.get('/scout', { preHandler }, getScout)
    fastify.get('/scout/live', { sse: true, preHandler }, getScoutLive)
    fastify.get('/scouterbee', { preHandler }, getScout)
    fastify.get('/scouterbee/live', { sse: true, preHandler }, getScoutLive)

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

    // loadbalancing
    fastify.get('/sites', getSites)
    fastify.get('/site/primary', getPrimarySite)
    fastify.get('/site/primary/:id', setPrimarySite)

    fastify.post('/site', { preHandler }, postSite)

    fastify.put('/site/:id', { preHandler }, putSite)

    fastify.delete('/site/:id', { preHandler }, deleteSite)

    // ai
    fastify.get('/clients', getClients)
    fastify.get('/ai/conversations', getConversations)
    fastify.get('/ai/conversations/:id', getConversation)
    fastify.post('/ai/conversations', postConversation)
    fastify.post('/ai/conversations/import-session', postImportSession)
    fastify.post('/ai/conversations/:id/restore', postRestoreConversation)
    fastify.post('/ai/conversations/:id/transfer', postTransferConversation)
    fastify.post('/ai/conversations/:id/share', postShareConversation)
    fastify.post('/ai/conversations/:id/switch-client', postSwitchConversationClient)
    fastify.post('/ai/shared/:token/copy', postCopySharedConversation)
    fastify.delete('/ai/conversations/:id', deleteConversation)

    // internal dashboard
    fastify.get('/dashboard/internal', getInternalDashboard)

    // internal api proxy
    fastify.get('/stats', { preHandler }, getInternalStats)
    fastify.get('/docker', { preHandler }, getInternalDocker)
    fastify.get('/docker/logs', { preHandler }, getInternalDockerLogs)
    fastify.get('/docker/:id', { preHandler }, getInternalDockerContainer)
    fastify.get('/ingress/:port', { preHandler }, getInternalIngress)
    fastify.get('/db', { preHandler }, getInternalDb)
    fastify.get('/backup', { preHandler }, getInternalBackup)
    fastify.post('/backup', { preHandler }, postInternalBackup)
    fastify.get('/backup/files', { preHandler }, getInternalBackupFiles)
    fastify.post('/backup/restore', { preHandler }, postInternalBackupRestore)
    fastify.get('/vulnerabilities', { preHandler }, getInternalVulnerabilities)
    fastify.post('/vulnerabilities/scan', { preHandler }, postInternalVulnerabilityScan)
    fastify.get('/deployments/:id', { preHandler }, getInternalDeployment)
    fastify.put('/deployments/:id/auto', { preHandler }, putInternalDeploymentAuto)
    fastify.post('/deployments/:id/run', { preHandler }, postInternalDeploymentRun)
}
