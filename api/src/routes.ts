import type { FastifyInstance } from 'fastify'

import preHandler from '#utils/auth/middleware.ts'

import getUser from './handlers/user/getUser.ts'
import getUsers from './handlers/user/getUsers.ts'
import getLogin from './handlers/login/getLogin.ts'
import getToken from './handlers/login/getToken.ts'
import getTokenBTG from './handlers/login/getTokenBTG.ts'
import getStatus from './handlers/monitoring/get.ts'
import getCallback from './handlers/login/getCallback.ts'
import postTraffic from './handlers/traffic/post.ts'
import getMetrics from './handlers/traffic/getMetrics.ts'
import getRecords from './handlers/traffic/getRecords.ts'
import getDomains from './handlers/traffic/getDomains.ts'
import getLive from './handlers/traffic/getLive.ts'
import getScout from './handlers/scouterbee/get.ts'
import getScoutLive from './handlers/scouterbee/getLive.ts'
import postStatusUpdate from './handlers/monitoring/postUpdate.ts'
import postService from './handlers/monitoring/post.ts'
import getIndex from './handlers/index/getIndex.ts'
import getHealth from './handlers/index/getHealth.ts'
import getVersion from './handlers/index/getVersion.ts'
import postStatusNotification from './handlers/monitoring/notification/postNotification.ts'
import getStatusNotifications from './handlers/monitoring/notification/getNotifications.ts'
import deleteStatus from './handlers/monitoring/deleteStatus.ts'
import deleteStatusNotification from './handlers/monitoring/notification/deleteNotification.ts'
import postTag from './handlers/monitoring/postTag.ts'
import deleteTag from './handlers/monitoring/deleteTag.ts'
import getTags from './handlers/monitoring/getTags.ts'
import deleteSite from './handlers/loadbalancing/deleteSite.ts'
import getSites from './handlers/loadbalancing/getSites.ts'
import getPrimarySite from './handlers/loadbalancing/getPrimarySite.ts'
import setPrimarySite from './handlers/loadbalancing/setPrimarySite.ts'
import postSite from './handlers/loadbalancing/postSite.ts'
import putSite from './handlers/loadbalancing/putSite.ts'
import getService from './handlers/monitoring/getService.ts'
import putService from './handlers/monitoring/putService.ts'
import putStatusNotification from './handlers/monitoring/notification/putNotification.ts'
import getInternalDashboard from './handlers/dashboard/internal/get.ts'
import getClients from './handlers/ai/getClients.ts'
import getConversations from './handlers/ai/getConversations.ts'
import getConversation from './handlers/ai/getConversation.ts'
import postConversation from './handlers/ai/postConversation.ts'
import postSwitchConversationClient from './handlers/ai/postSwitchConversationClient.ts'
import deleteConversation from './handlers/ai/deleteConversation.ts'
import postRestoreConversation from './handlers/ai/postRestoreConversation.ts'
import postImportSession from './handlers/ai/postImportSession.ts'
import postTransferConversation from './handlers/ai/postTransferConversation.ts'
import postShareConversation from './handlers/ai/postShareConversation.ts'
import postCopySharedConversation from './handlers/ai/postCopySharedConversation.ts'
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
