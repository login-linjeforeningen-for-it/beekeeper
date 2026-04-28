import type { FastifyReply, FastifyRequest } from 'fastify'
import proxyInternal, { buildInternalUrl, internalHeaders } from '#utils/proxyInternal.ts'

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

type ProxyPath = string | ((req: FastifyRequest) => string)
type ProxyBody = (req: FastifyRequest) => unknown

function createProxyHandler(path: ProxyPath, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: ProxyBody
}) {
    return function internalProxyHandler(req: FastifyRequest, res: FastifyReply) {
        return proxyInternal(req, res, {
            method: options?.method,
            path: typeof path === 'function' ? path(req) : path,
            body: options?.body?.(req),
        })
    }
}

export const getInternalStats = createProxyHandler('stats')
export const getInternalDocker = createProxyHandler('docker')

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

export const getInternalDockerContainer = createProxyHandler((req) => {
    const { id } = req.params as { id: string }
    return `docker/${id}`
})
export const getInternalIngress = createProxyHandler((req) => {
    const { port } = req.params as { port: string }
    return `ingress/${port}`
})
export const getInternalDb = createProxyHandler('db')
export const getInternalBackup = createProxyHandler('backup')
export const postInternalBackup = createProxyHandler('backup', {
    method: 'POST',
    body: (req) => req.body ?? {},
})
export const getInternalBackupFiles = createProxyHandler('backup/files')
export const postInternalBackupRestore = createProxyHandler('backup/restore', {
    method: 'POST',
    body: (req) => req.body ?? {},
})
export const getInternalVulnerabilities = createProxyHandler('vulnerabilities')
export const postInternalVulnerabilityScan = createProxyHandler('vulnerabilities/scan', {
    method: 'POST',
    body: (req) => req.body ?? {},
})
export const getInternalDeployment = createProxyHandler((req) => {
    const { id } = req.params as { id: string }
    return `deployments/${id}`
})
export const putInternalDeploymentAuto = createProxyHandler((req) => {
    const { id } = req.params as { id: string }
    return `deployments/${id}/auto`
}, {
    method: 'PUT',
    body: (req) => req.body ?? {},
})
export const postInternalDeploymentRun = createProxyHandler((req) => {
    const { id } = req.params as { id: string }
    return `deployments/${id}/run`
}, {
    method: 'POST',
    body: (req) => req.body ?? {},
})

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
