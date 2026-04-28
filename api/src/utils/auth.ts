import type { FastifyReply, FastifyRequest } from 'fastify'
import config from '#constants'

const { USERINFO_URL, BTG_TOKEN } = config

type CheckTokenResponse = {
    valid: boolean
    userInfo?: {
        sub: string
        name: string
        email: string
    }
    error?: string
}

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: string
            name: string
            email: string
        }
    }
}

export async function preHandler(req: FastifyRequest, res: FastifyReply) {
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

export async function tokenWrapper(req: FastifyRequest, res: FastifyReply): Promise<{ valid: boolean, error?: string }> {
    const token = getBearerToken(req)
    if (!token) {
        return {
            valid: false,
            error: 'Missing or invalid Authorization header'
        }
    }

    try {
        const userInfoRes = await fetch(USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (userInfoRes.status === 503 && token && token.length > 1000) {
            if (token === BTG_TOKEN) {
                return {
                    valid: true
                }
            } else {
                return {
                    valid: false,
                    error: 'Unauthorized'
                }
            }
        }

        if (!userInfoRes.ok) {
            return {
                valid: false,
                error: 'Unauthorized'
            }
        }

        return { valid: true }
    } catch (err) {
        res.log.error(err)
        return res.status(500).send({
            valid: false,
            error: 'Internal server error'
        })
    }
}

async function checkToken(req: FastifyRequest, res: FastifyReply): Promise<CheckTokenResponse> {
    const token = getBearerToken(req)
    if (!token) {
        return {
            valid: false,
            error: 'Missing or invalid Authorization header'
        }
    }

    try {
        const userInfoRes = await fetch(USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (!userInfoRes.ok) {
            return {
                valid: false,
                error: 'Unauthorized'
            }
        }

        const userInfo = await userInfoRes.json()
        const groups = Array.isArray(userInfo.groups) ? userInfo.groups : []
        if (!groups.includes('TekKom') && !groups.includes('queenbee')) {
            return {
                valid: false,
                error: 'Unauthorized'
            }
        }

        return {
            valid: true,
            userInfo: userInfo
        }
    } catch (err) {
        res.log.error(err)
        return res.status(500).send({
            valid: false,
            error: 'Internal server error'
        })
    }
}

function getBearerToken(req: FastifyRequest) {
    const authHeader = req.headers['authorization']
    return authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
}
