import fetchInternal from './fetchInternal.ts'

export default async function getSystem(): Promise<System> {
    try {
        return await fetchInternal<System>('stats/dashboard')
    } catch (error) {
        console.log(error)

        return {
            ram: 'No RAM',
            processes: 0,
            disk: 'No Disk',
            load: 'No load',
            containers: 0
        }
    }
}
