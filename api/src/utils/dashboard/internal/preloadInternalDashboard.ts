import getAlerts from './helpers/getAlerts.ts'
import getDatabaseOverview from './helpers/getDatabaseOverview.ts'
import getDatabases from './helpers/getDatabases.ts'
import getDocker from './helpers/getDocker.ts'
import getMetrics from './helpers/getMetrics.ts'
import getMonitored from './helpers/getMonitored.ts'
import getPrimarySite from './helpers/getPrimarySite.ts'
import getRequestsToday from './helpers/getRequestsToday.ts'
import getSites from './helpers/getSites.ts'
import getSystem from './helpers/getSystem.ts'

export default async function preloadInternalDashboard(): Promise<InternalDashboard> {
    const [
        alerts,
        databases,
        sites,
        monitored,
        requestsToday,
        primarySite,
        metrics,
        system,
        docker,
        databaseOverview,
    ] = await Promise.all([
        getAlerts(),
        getDatabases(),
        getSites(),
        getMonitored(),
        getRequestsToday(),
        getPrimarySite(),
        getMetrics(),
        getSystem(),
        getDocker(),
        getDatabaseOverview(),
    ])

    return {
        statistics: {
            alerts,
            databases,
            sites,
            monitored,
            requestsToday
        },
        information: {
            primarySite,
            system
        },
        runtime: {
            metrics,
            docker,
            databaseOverview
        }
    }
}
