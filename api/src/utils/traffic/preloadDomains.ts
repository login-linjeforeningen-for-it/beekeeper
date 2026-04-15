import run from '#db'

export default async function preloadDomains() {
    try {
        const result = await run('SELECT DISTINCT domain FROM traffic ORDER BY domain')
        const domains = result.rows.map(row => row.domain)
        return domains
    } catch (error) {
        console.log(error)
        return []
    }
}
