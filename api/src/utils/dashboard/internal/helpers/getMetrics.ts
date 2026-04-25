import fetchInternal from './fetchInternal.ts'

export default async function getMetrics(): Promise<Stats> {
    try {
        return await fetchInternal<Stats>('stats')
    } catch (error) {
        console.log(error)
        return {
            system: {
                load: [],
                memory: {
                    used: 0,
                    total: 0,
                    percent: '0',
                },
                swap: '0',
                disk: 'N/A',
                temperature: 'N/A',
                powerUsage: 'N/A',
                processes: 0,
                ipv4: [],
                ipv6: [],
                os: 'Unknown',
            }
        }
    }
}
