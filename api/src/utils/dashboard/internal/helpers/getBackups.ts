import config from '#constants'

export default async function getBackups(): Promise<number> {
    try {
        const response = await fetch(`${config.internal}/databases`)
        if (!response.ok) {
            throw new Error(await response.text())
        }

        const data = await response.json()
        if (!('count' in data)) {
            throw new Error(`Missing count: ${await response.text()}`)
        }

        return data.count
    } catch (error) {
        if (!isExpectedInternalAuthError(error)) {
            console.log(error)
        }

        return 0
    }
}

function isExpectedInternalAuthError(error: unknown) {
    return error instanceof Error
        && error.message.includes('Missing or invalid Authorization header')
}
