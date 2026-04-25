import config from '#constants'

export async function sendProjectAlert(finalReport: {
    title: string
    description: string
    highestSeverity: 'critical' | 'high' | 'medium'
}) {
    const data: { content?: string; embeds: object[] } = {
        embeds: [
            {
                title: finalReport.title,
                description: finalReport.description,
                color: finalReport.highestSeverity === 'critical' ? 0x800080 : 0xff0000,
                timestamp: new Date().toISOString()
            }
        ]
    }

    if (finalReport.highestSeverity === 'critical' && config.CRITICAL_DEVELOPMENT_ROLE) {
        data.content = `🐝 <@&${config.CRITICAL_DEVELOPMENT_ROLE}> 🐝`
    }

    const response = await fetch(config.WEBHOOK_URL ?? '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        throw new Error(await response.text())
    }
}

export async function sendSecretAlert(ping: boolean, red: boolean, finalReport: string) {
    const data: { content?: string; embeds: object[] } = {
        embeds: [
            {
                title: '🐝 Secret Report 🐝',
                description: finalReport,
                color: ping || red ? 0xff0000 : 0xfd8738,
                timestamp: new Date().toISOString()
            }
        ]
    }

    if (ping && config.CRITICAL_ROLE) {
        data.content = `🐝 <@&${config.CRITICAL_ROLE}> 🐝`
    }

    const response = await fetch(config.WEBHOOK_URL ?? '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        throw new Error(await response.text())
    }
}
