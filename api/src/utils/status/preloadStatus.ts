import run from '#db'
import debug from '#utils/debug.ts'
import { loadSQL } from '#utils/loadSQL.ts'
import { getCertificateDetails } from './getCertificateDetails'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let domainInfo: any[] = []

export default async function preloadStatus(): Promise<Monitoring[]> {
    try {
        console.log('getStatus')
        const query = await loadSQL('fetchService.sql')
        const result = await run(query)

        const domainsLength = result.rows.filter((row) => row.url && row.url.startsWith('https://')).length
        if (domainInfo.length !== domainsLength) {
            const temp = []
            for (const service of result.rows) {
                if (service.url && service.url.startsWith('https://')) {
                    const cert = await getCertificateDetails(service)
                    temp.push(cert.valid ? {
                        valid: cert.valid,
                        subjectCN: cert.subjectCN,
                        issuer: cert.issuer,
                        validFrom: cert.validFrom,
                        validTo: cert.validTo,
                        keyType: cert.keyType,
                        dnsNames: cert.dnsNames,
                    } : { ...cert })
                }
            }

            domainInfo = temp
        }

        const merged = result.rows.map((service, index) => ({
            ...service,
            certificate: domainInfo[index]
        }))

        return merged
    } catch (error) {
        debug({ basic: `Database error in getStatus: ${JSON.stringify(error)}` })
        return []
    }
}
