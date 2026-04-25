import fetchInternal from './fetchInternal.ts'

export default async function getDocker(): Promise<Docker> {
    try {
        return await fetchInternal<Docker>('docker')
    } catch (error) {
        console.log(error)
        return {
            status: 'unavailable',
            count: 0,
            containers: [],
            error: error instanceof Error ? error.message : 'Failed to load docker',
        }
    }
}
