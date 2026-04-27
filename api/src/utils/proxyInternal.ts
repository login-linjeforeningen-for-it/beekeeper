import type { FastifyReply, FastifyRequest } from 'fastify'
import buildInternalUrl from './buildInternalUrl'
import config from '#constants'

type ProxyOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    body?: unknown
}

export default async function proxyInternal(
    req: FastifyRequest,
    res: FastifyReply,
    { method = 'GET', path, body }: ProxyOptions
) {
    try {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${config.INTERNAL_TOKEN}`,
            service: 'beekeeper',
            'x-service': 'beekeeper',
            'x-internal-service': 'beekeeper',
        }

        if (body !== undefined) {
            headers['Content-Type'] = 'application/json'
        }

        const response = await fetch(buildInternalUrl(path, req.raw.url), {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        })

        const contentType = response.headers.get('content-type') || 'application/json'
        const text = await response.text()

        res.status(response.status)
        res.header('Content-Type', contentType)

        if (contentType.includes('application/json')) {
            try {
                return res.send(text ? JSON.parse(text) : null)
            } catch {
                return res.send({ error: text || 'Invalid upstream JSON response' })
            }
        }

        return res.send(text)
    } catch (error) {
        return res.status(500).send({
            error: error instanceof Error ? error.message : 'Failed to reach internal API'
        })
    }
}
