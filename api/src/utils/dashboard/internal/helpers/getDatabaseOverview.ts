import fetchInternal from './fetchInternal.ts'

export default async function getDatabaseOverview(): Promise<DatabaseOverviewResponse | null> {
    try {
        return await fetchInternal<DatabaseOverviewResponse>('db')
    } catch (error) {
        console.log(error)
        return null
    }
}
