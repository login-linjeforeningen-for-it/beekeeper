import config from '#constants'

export default async function getSystem(): Promise<System> {
    try {
        const response = await fetch(`${config.internal}/stats/dashboard`)
        if (!response.ok) {
            throw new Error(await response.text())
        }

        const data = await response.json()
        return data
    } catch (error) {
        if (!isExpectedInternalAuthError(error)) {
            console.log(error)
        }

        return {
            ram: 'No RAM',
            processes: 0,
            disk: 'No Disk',
            load: 'No load',
            containers: 0
        }
    }
}

function isExpectedInternalAuthError(error: unknown) {
    return error instanceof Error
        && error.message.includes('Missing or invalid Authorization header')
}
