import config from '#constants'

export default function internalHeaders(extraHeaders?: Record<string, string>) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${config.INTERNAL_TOKEN}`,
        service: 'beekeeper',
        'x-service': 'beekeeper',
        'x-internal-service': 'beekeeper',
    }

    return extraHeaders ? { ...headers, ...extraHeaders } : headers
}
