import type { FastifyReply, FastifyRequest } from 'fastify'
import proxyInternal from '#utils/proxyInternal.ts'
import buildInternalUrl from '#utils/buildInternalUrl.ts'
import internalHeaders from '#utils/internalHeaders.ts'

type CachedProxyResponse = {
    status: number
    contentType: string
    body: string
    expiresAt: number
}

type DockerLogsCacheEntry = {
    request: DockerLogsRequest
    response: CachedProxyResponse
    lastAccessedAt: number
}

type DockerLogsRequest = {
    authHeader?: string
    rawUrl?: string
}

const dockerLogsCache = new Map<string, DockerLogsCacheEntry>()
const dockerLogsInflight = new Map<string, Promise<CachedProxyResponse>>()
const DOCKER_LOGS_REFRESH_MS = 5000
const DOCKER_LOGS_MAX_STALE_MS = 10 * 60 * 1000

export function getInternalStats(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'stats' })
}

export function getInternalDocker(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'docker' })
}

export async function getInternalDockerLogs(req: FastifyRequest, res: FastifyReply) {
    const request = getDockerLogsRequest(req)
    const cacheKey = getDockerLogsCacheKey(request)
    const now = Date.now()
    const cached = dockerLogsCache.get(cacheKey)
    if (cached) {
        cached.lastAccessedAt = now
        if (cached.response.expiresAt <= now) {
            void refreshDockerLogsCache(cacheKey, request)
        }
        return sendCachedProxyResponse(res, cached.response)
    }

    try {
        const response = await refreshDockerLogsCache(cacheKey, request)
        return sendCachedProxyResponse(res, response)
    } catch (error) {
        return res.status(500).send({
            error: error instanceof Error ? error.message : 'Failed to reach internal API'
        })
    }
}

export function getInternalDockerContainer(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    return proxyInternal(req, res, { path: `docker/${id}` })
}

export function getInternalIngress(req: FastifyRequest, res: FastifyReply) {
    const { port } = req.params as { port: string }
    return proxyInternal(req, res, { path: `ingress/${port}` })
}

export function getInternalDb(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'db' })
}

export function getInternalBackup(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'backup' })
}

export function postInternalBackup(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, {
        method: 'POST',
        path: 'backup',
        body: req.body ?? {},
    })
}

export function getInternalBackupFiles(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'backup/files' })
}

export function postInternalBackupRestore(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, {
        method: 'POST',
        path: 'backup/restore',
        body: req.body ?? {},
    })
}

export function getInternalVulnerabilities(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'vulnerabilities' })
}

export function postInternalVulnerabilityScan(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, {
        method: 'POST',
        path: 'vulnerabilities/scan',
        body: req.body ?? {},
    })
}

export function getInternalDeployment(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    return proxyInternal(req, res, { path: `deployments/${id}` })
}

export function putInternalDeploymentAuto(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    return proxyInternal(req, res, {
        method: 'PUT',
        path: `deployments/${id}/auto`,
        body: req.body ?? {},
    })
}

export function postInternalDeploymentRun(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    return proxyInternal(req, res, {
        method: 'POST',
        path: `deployments/${id}/run`,
        body: req.body ?? {},
    })
}

function getDockerLogsRequest(req: FastifyRequest): DockerLogsRequest {
    return {
        authHeader: req.headers.authorization,
        rawUrl: req.raw.url || '/docker/logs',
    }
}

function getDockerLogsCacheKey(request: DockerLogsRequest) {
    return `${request.authHeader || ''}::${request.rawUrl || '/docker/logs'}`
}

async function refreshDockerLogsCache(cacheKey: string, request: DockerLogsRequest) {
    const inflight = dockerLogsInflight.get(cacheKey)
    if (inflight) {
        return inflight
    }

    const nextRequest = fetchDockerLogs(request)
    dockerLogsInflight.set(cacheKey, nextRequest)

    try {
        const response = await nextRequest
        dockerLogsCache.set(cacheKey, {
            request,
            response,
            lastAccessedAt: Date.now(),
        })
        pruneDockerLogsCache()
        return response
    } finally {
        dockerLogsInflight.delete(cacheKey)
    }
}

async function fetchDockerLogs(request: DockerLogsRequest): Promise<CachedProxyResponse> {
    const response = await fetch(buildInternalUrl('docker/logs', request.rawUrl), {
        method: 'GET',
        headers: internalHeaders(),
    })

    const contentType = response.headers.get('content-type') || 'application/json'
    const body = await response.text()

    return {
        status: response.status,
        contentType,
        body,
        expiresAt: Date.now() + DOCKER_LOGS_REFRESH_MS,
    }
}

function sendCachedProxyResponse(res: FastifyReply, response: CachedProxyResponse) {
    res.status(response.status)
    res.header('Content-Type', response.contentType)

    if (response.contentType.includes('application/json')) {
        try {
            return res.send(response.body ? JSON.parse(response.body) : null)
        } catch {
            return res.send({ error: response.body || 'Invalid upstream JSON response' })
        }
    }

    return res.send(response.body)
}

function pruneDockerLogsCache() {
    const now = Date.now()
    for (const [key, value] of dockerLogsCache) {
        if (value.lastAccessedAt + DOCKER_LOGS_MAX_STALE_MS <= now) {
            dockerLogsCache.delete(key)
        }
    }
}

setInterval(() => {
    const now = Date.now()
    for (const [key, value] of dockerLogsCache) {
        if (value.response.expiresAt <= now) {
            void refreshDockerLogsCache(key, value.request)
        }
    }
}, DOCKER_LOGS_REFRESH_MS).unref()
