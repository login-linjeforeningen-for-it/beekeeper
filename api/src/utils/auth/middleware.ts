import type { FastifyReply, FastifyRequest } from 'fastify'
import checkToken from './validateToken.ts'

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: string
            name: string
            email: string
        }
    }
}

export default async function auth(req: FastifyRequest, res: FastifyReply) {
    const tokenResult = await checkToken(req, res)
    if (!tokenResult.valid || !tokenResult.userInfo) {
        return res.status(401).send({ error: tokenResult.error })
    }

    req.user = {
        id: tokenResult.userInfo.sub,
        name: tokenResult.userInfo.name,
        email: tokenResult.userInfo.email
    }
}
