import config from '#constants'
import internalHeaders from '#utils/internalHeaders.ts'

export default async function fetchInternal<T>(path: string): Promise<T> {
    const response = await fetch(`${config.internal}/${path.replace(/^\/+/, '')}`, {
        headers: internalHeaders(),
    })

    if (!response.ok) {
        throw new Error(await response.text())
    }

    return await response.json() as T
}
