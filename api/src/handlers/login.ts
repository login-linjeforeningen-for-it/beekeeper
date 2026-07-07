import type { FastifyReply, FastifyRequest } from 'fastify'
import config from '#constants'
import { tokenWrapper } from '#utils/auth.ts'
import debug from '#utils/debug.ts'

const { CRITICAL_ROLE, WEBHOOK_URL } = config

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

async function discordAlert(description: string) {
    try {
        const data: { content?: string; embeds: object[] } = {
            embeds: [
                {
                    title: '🐝 BeeKeeper BTG Login 🐝',
                    description,
                    color: 0xff0000,
                    timestamp: new Date().toISOString()
                }
            ]
        }

        if (CRITICAL_ROLE) {
            data.content = `🚨 <@&${CRITICAL_ROLE}> 🚨`
        }

        const response = await fetch(WEBHOOK_URL ?? '', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error(await response.text())
        }

        return response.status
    } catch (error) {
        debug({ basic: (error as Error) })
    }
}
