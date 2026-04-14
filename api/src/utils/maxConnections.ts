import config from '#constants'
import run from '#db'
import debug from './debug.ts'

export default function checkMaxConnectionsCron() {
    setTimeout(() => {
        checkMaxConnections()
    }, 5000)
}

async function checkMaxConnections() {
    try {
        const result = await run('SELECT count(*) FROM pg_stat_activity WHERE state=\'active\';')
        const active = Number(result.rows[0]?.count) || 0
        const maxRes = await run('SHOW max_connections;')
        const maxConnections = Number(maxRes.rows[0]?.max_connections) || 0
        const THRESHOLD = Math.floor(maxConnections / 2)
        const SEVERE_THRESHOLD = (maxConnections / 10) * 9

        if (active > THRESHOLD && config.WEBHOOK_URL) {
            console.warn(`Active connections ${active} > ${THRESHOLD}, sending Discord alert...`)

            const data: { content?: string; embeds: object[] } = {
                embeds: [
                    {
                        title: '🐝 BeeKeeper Database Max Connections 🐝',
                        description: `🐝 Many connections detected: ${active.toFixed(2)}/${THRESHOLD}.`,
                        color: 0xff0000,
                        timestamp: new Date().toISOString()
                    }
                ]
            }

            if (active > SEVERE_THRESHOLD) {
                data.content = `🚨 <@&${config.CRITICAL_DEVELOPMENT_ROLE}> 🚨`
            }

            await fetch(config.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
        } else {
            debug({ basic: `Active connections: ${active}` })
        }
    } catch (error) {
        debug({ basic: `checkMaxConnections error: ${error}` })
    }
}
