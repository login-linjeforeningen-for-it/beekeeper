import run from '#db'

export default async function getPrimarySite(): Promise<PrimarySite> {
    const result = await run('SELECT * FROM sites WHERE "primary" = TRUE LIMIT 1')
    return result.rows[0] || {
        id: 0,
        name: 'No sites found.',
        ip: '0.0.0.0',
        primary: false
    }
}
