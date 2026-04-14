import run from '#db'

export default async function getRequestsToday(): Promise<number> {
    try {
        const result = await run(
            `SELECT COUNT(*) AS count
             FROM traffic
             WHERE timestamp >= date_trunc('day', NOW());`
        )

        return Number(result.rows[0]?.count)
    } catch (error) {
        console.log(error)
        return 0
    }
}
