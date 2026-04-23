import config from '#constants'

export default function buildInternalUrl(path: string, rawUrl?: string) {
    const base = config.internal.replace(/\/$/, '')
    const query = rawUrl?.split('?')[1]
    return `${base}/${path}${query ? `?${query}` : ''}`
}
