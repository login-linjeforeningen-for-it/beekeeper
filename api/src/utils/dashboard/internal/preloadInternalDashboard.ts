import {
    countRows,
    getAlerts,
    getDatabaseOverview,
    getDatabases,
    getDocker,
    getMetrics,
    getPrimarySite,
    getRequestsToday,
    getSystem,
} from './sources.ts'

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
        countRows('sites'),
        countRows('status'),
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
