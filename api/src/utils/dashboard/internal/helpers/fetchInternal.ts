import config from '#constants'

export default async function fetchInternal<T>(path: string): Promise<T> {
    const response = await fetch(`${config.internal}/${path.replace(/^\/+/, '')}`, {
        headers: {
            Authorization: `Bearer ${config.INTERNAL_TOKEN}`,
            service: 'beekeeper',
        },
    })

    if (!response.ok) {
        throw new Error(await response.text())
    }

    return await response.json() as T
}
