import type { FastifyReply, FastifyRequest } from 'fastify'
import config from '#constants'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import discordAlert from '#utils/discordAlert.ts'
import debug from '#utils/debug.ts'

const { TOKEN_URL, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, USERINFO_URL, AUTH_URL, beekeeper } = config

type UserInfo = {
    sub: string
    name: string
    email: string
    groups: string[]
}

export function getLogin(_: FastifyRequest, res: FastifyReply) {
    const state = Math.random().toString(36).substring(5)
    const authQueryParams = new URLSearchParams({
        client_id: CLIENT_ID as string,
        redirect_uri: REDIRECT_URI as string,
        response_type: 'code',
        scope: 'openid profile email',
        state: state,
    }).toString()

    res.redirect(`${AUTH_URL}?${authQueryParams}`)
}

export async function getCallback(req: FastifyRequest, res: FastifyReply): Promise<object> {
    const { code } = req.query as { code: string }

    if (!code) {
        return res.status(400).send('No authorization code found.')
    }

    try {
        const tokenResponse = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID as string,
                client_secret: CLIENT_SECRET as string,
                code: code as string,
                redirect_uri: REDIRECT_URI as string,
                grant_type: 'authorization_code',
            }).toString()
        })

        const tokenResponseBody = await tokenResponse.text()

        if (!tokenResponse.ok) {
            return res.status(500).send(`Failed to obtain token: ${tokenResponseBody}`)
        }

        const token = JSON.parse(tokenResponseBody)
        const userInfoResponse = await fetch(USERINFO_URL, {
            headers: { Authorization: `Bearer ${token.access_token}` }
        })

        if (!userInfoResponse.ok) {
            const userInfoError = await userInfoResponse.text()
            return res.status(500).send(`No user info found: ${userInfoError}`)
        }

        const userInfo = await userInfoResponse.json() as UserInfo
        const redirectUrl = new URL(`${beekeeper}/login`)
        const params = new URLSearchParams({
            id: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            groups: userInfo.groups.join(','),
            access_token: token.access_token
        })

        redirectUrl.search = params.toString()
        return res.redirect(redirectUrl.toString())
    } catch (err: unknown) {
        const error = err as Error
        debug({ basic: `Error during OAuth2 flow: ${error.message}` })
        return res.status(500).send('Authentication failed')
    }
}

export async function getToken(req: FastifyRequest, res: FastifyReply) {
    const response = await tokenWrapper(req, res)
    if (!response.valid) {
        return res.status(400).send(response)
    }

    return res.status(200).send(response)
}

export async function getTokenBTG(req: FastifyRequest, res: FastifyReply) {
    const response = await tokenWrapper(req, res)
    if (!response.valid) {
        discordAlert('A user has failed to access the system using the break-the-glass account. Immediate attention may be required.')
        return res.status(400).send(response)
    }

    discordAlert('A user has successfully accessed the system using the break-the-glass account. Immediate attention may be required.')
    return res.status(200).send(response)
}
