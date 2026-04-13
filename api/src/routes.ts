import type { FastifyInstance } from 'fastify'

import preHandler from '#utils/authMiddleware.ts'

import getPods from './handlers/pod/get.ts'
import getUser from './handlers/user/getUser.ts'
import getUsers from './handlers/user/getUsers.ts'
import getLogin from './handlers/login/getLogin.ts'
import getToken from './handlers/login/getToken.ts'
import getTokenBTG from './handlers/login/getTokenBTG.ts'
import getHealthStatus from './handlers/index/getStatus.ts'
import getStatus from './handlers/monitoring/get.ts'
import getContexts from './handlers/context/get.ts'
import getCallback from './handlers/login/getCallback.ts'
import getLocalCommands from './handlers/command/local/get.ts'
import getGlobalCommands from './handlers/command/global/get.ts'
import getNamespaces from './handlers/namespace/get.ts'
import getNamespaceNotes from './handlers/namespace/note/get.ts'
import getNamespaceDomains from './handlers/namespace/domain/get.ts'
import getNamespaceDomainsByNamespace from './handlers/namespace/domain/getByNamespace.ts'
import getMessages from './handlers/message/get.ts'
import getNamespaceIncidents from './handlers/namespace/incident/get.ts'
import getIngress from './handlers/ingress/get.ts'
import getIngressEvents from './handlers/ingress/events/get.ts'
import getLog from './handlers/log/get.ts'

import postContext from './handlers/context/post.ts'
import postCommand from './handlers/command/post.ts'
import postLocalCommand from './handlers/command/local/post.ts'
import postGlobalCommand from './handlers/command/global/post.ts'
import postNamespace from './handlers/namespace/post.ts'
import postNamespaceNote from './handlers/namespace/note/post.ts'
import postNamespaceDomain from './handlers/namespace/domain/post.ts'
import postNamespaceIncident from './handlers/namespace/incident/post.ts'
import postMessage from './handlers/message/post.ts'
import postPod from './handlers/pod/post.ts'
import postLocalLog from './handlers/log/local/post.ts'
import postGlobalLog from './handlers/log/global/post.ts'

import putLocalCommand from './handlers/command/local/put.ts'
import putGlobalCommand from './handlers/command/global/put.ts'
import putNamespaceNote from './handlers/namespace/note/put.ts'
import putNamespaceDomain from './handlers/namespace/domain/put.ts'
import putNamespaceIncident from './handlers/namespace/incident/put.ts'
import putMessage from './handlers/message/put.ts'

import deleteLocalCommand from './handlers/command/local/delete.ts'
import deleteGlobalCommand from './handlers/command/global/delete.ts'
import deleteNamespaceNote from './handlers/namespace/note/delete.ts'
import deleteNamespaceDomain from './handlers/namespace/domain/delete.ts'
import deleteNamespaceIncident from './handlers/namespace/incident/delete.ts'
import deleteMessage from './handlers/message/delete.ts'

import postTraffic from './handlers/traffic/post.ts'
import getMetrics from './handlers/traffic/getMetrics.ts'
import getRecords from './handlers/traffic/getRecords.ts'
import getDomains from './handlers/traffic/getDomains.ts'
import getLive from './handlers/traffic/getLive.ts'
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

export default async function apiRoutes(fastify: FastifyInstance) {
    // index
    fastify.get('/', getIndex)
    fastify.get('/health', getHealth)
    fastify.get('/version', getVersion)
    fastify.get('/status', getHealthStatus)

    // context
    fastify.get('/contexts', getContexts)

    fastify.post('/contexts', postContext)

    // namespace
    fastify.get('/namespaces', getNamespaces)
    fastify.get('/namespaces/notes/:context/:namespace', getNamespaceNotes)
    fastify.get('/namespaces/domains/:context', getNamespaceDomains)
    fastify.get('/namespaces/domains/:context/:namespace', getNamespaceDomainsByNamespace)
    fastify.get('/namespaces/incidents/:context/:namespace', getNamespaceIncidents)
    fastify.get('/namespaces/ingress/:context/:namespace', getIngress)
    fastify.get('/namespaces/ingress/events/:context/:namespace/:name', getIngressEvents)

    fastify.post('/namespaces', postNamespace)
    fastify.post('/namespaces/notes', postNamespaceNote)
    fastify.post('/namespaces/domains', postNamespaceDomain)
    fastify.post('/namespaces/incidents', postNamespaceIncident)

    fastify.put('/namespaces/notes', putNamespaceNote)
    fastify.put('/namespaces/domains', putNamespaceDomain)
    fastify.put('/namespaces/incidents', putNamespaceIncident)

    fastify.delete('/namespaces/notes/:id', deleteNamespaceNote)
    fastify.delete('/namespaces/domains/:id', deleteNamespaceDomain)
    fastify.delete('/namespaces/incidents/:id', deleteNamespaceIncident)

    // log
    fastify.get('/log/:log', getLog)

    fastify.post('/log/global', postGlobalLog)
    fastify.post('/log/local', postLocalLog)

    // command
    fastify.get('/commands/local', getLocalCommands)
    fastify.get('/commands/global', getGlobalCommands)

    fastify.post('/command', postCommand)
    fastify.post('/commands/local', postLocalCommand)
    fastify.post('/commands/global', postGlobalCommand)

    fastify.put('/commands/local', putLocalCommand)
    fastify.put('/commands/global', putGlobalCommand)

    fastify.delete('/commands/local/:id', deleteLocalCommand)
    fastify.delete('/commands/global/:id', deleteGlobalCommand)

    // pod
    fastify.get('/pods', getPods)

    fastify.post('/pods', postPod)

    // user
    fastify.get('/user/:email', getUser)
    fastify.get('/users', getUsers)
    fastify.get('/token', getToken)
    fastify.get('/token/btg', getTokenBTG)

    // login
    fastify.get('/login', getLogin)
    fastify.get('/callback', getCallback)

    // messages
    fastify.get('/messages', getMessages)

    fastify.post('/messages', postMessage)

    fastify.put('/messages', putMessage)

    fastify.delete('/messages/:id', deleteMessage)

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

    // loadbalancing
    fastify.get('/sites', getSites)
    fastify.get('/site/primary', getPrimarySite)
    fastify.get('/site/primary/:id', setPrimarySite)

    fastify.post('/site', { preHandler }, postSite)

    fastify.put('/site/:id', { preHandler }, putSite)

    fastify.delete('/site/:id', { preHandler }, deleteSite)

    // ai
    fastify.get('/clients', getClients)

    // internal dashboard
    fastify.get('/dashboard/internal', getInternalDashboard)
}
