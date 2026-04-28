import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import config from '../../package.json' with { type: 'json' }

export async function getIndex(req: FastifyRequest, res: FastifyReply) {
    const routes = req.server.printRoutes({ commonPrefix: false })
    res.send(`BeeKeeper API.\n\nValid endpoints are:\n\n${routes}`)
}

export async function getHealth(_: FastifyRequest, res: FastifyReply) {
    res.send(200)
}

export function getVersion(_: FastifyRequest, res: FastifyReply) {
    return res.send(config.version)
}

export async function getInternalDashboard(
    this: FastifyInstance,
    _: FastifyRequest,
    res: FastifyReply
) {
    res.type('application/json').send(this.internalDashboard)
}

export async function getFavicon(
    this: FastifyInstance,
    _req: FastifyRequest,
    res: FastifyReply
) {
    res.type('image/x-icon').send(this.favicon)
}
