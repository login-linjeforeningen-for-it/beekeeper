import getAlerts from './helpers/getAlerts.ts'
import getBackups from './helpers/getBackups.ts'
import getMonitored from './helpers/getMonitored.ts'
import getPrimarySite from './helpers/getPrimarySite.ts'
import getRequestsToday from './helpers/getRequestsToday.ts'
import getSites from './helpers/getSites.ts'
import getSystem from './helpers/getSystem.ts'

export default async function preloadInternalDashboard(): Promise<InternalDashboard> {
    const alerts = await getAlerts()
    const backups = await getBackups()
    const sites = await getSites()
    const monitored = await getMonitored()
    const requestsToday = await getRequestsToday()
    const primarySite = await getPrimarySite()
    const system = await getSystem()

    return {
        statistics: {
            alerts,
            backups,
            sites,
            monitored,
            requestsToday
        },
        information: {
            primarySite,
            system
        }
    }
}
