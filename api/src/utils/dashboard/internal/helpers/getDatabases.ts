import fetchInternal from './fetchInternal.ts'

export default async function getDatabases(): Promise<number> {
    try {
        const data = await fetchInternal<{
            databaseCount?: number
        }>('db')

        if (typeof data.databaseCount !== 'number') {
            throw new Error('Missing databaseCount')
        }

        return data.databaseCount
    } catch (error) {
        console.log(error)
        return 0
    }
}
