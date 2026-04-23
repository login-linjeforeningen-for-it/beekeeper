import type { FastifyReply, FastifyRequest } from 'fastify'
import proxyInternal from '#utils/proxyInternal.ts'

export function getInternalStats(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'stats' })
}

export function getInternalDocker(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'docker' })
}

export function getInternalDockerLogs(req: FastifyRequest, res: FastifyReply) {
    return proxyInternal(req, res, { path: 'docker/logs' })
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
