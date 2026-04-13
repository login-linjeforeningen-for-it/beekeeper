import run from '#db'
import getNamespaces from '#utils/getNamespaces.ts'
import { loadSQL } from '#utils/loadSQL.ts'
import { contexts, fallback, priority } from './defaults.ts'
import worstAndBestServiceStatus from './worstAndBestServiceStatus.ts'

export default async function preloadStatus(): Promise<Status> {
    try {
        const uptimeByService = await fetchServiceUptimeLastMonth()
        const namespaces = await getNamespaces()
        const prod: Service[] = []
        const dev: Service[] = []

        for (const namespace of namespaces) {
            if (namespace.context.includes(contexts.prod)) {
                prod.push(namespace)
            } else {
                dev.push(namespace)
            }
        }

        const { meta: metaProd, status: statusProd } = await worstAndBestServiceStatus({
            context: contexts.prod,
            services: prod,
        })

        const { meta: metaDev, status: statusDev } = await worstAndBestServiceStatus({
            context: contexts.dev,
            services: dev,
        })

        const prodWithUptime = enrichServicesWithUptime(statusProd, uptimeByService)
        const devWithUptime = enrichServicesWithUptime(statusDev, uptimeByService)

        return {
            prod: {
                status: {
                    number: priority[metaProd],
                    message: metaProd
                },
                services: prodWithUptime,
                meta: metaProd
            },
            dev: {
                status: {
                    number: priority[metaDev],
                    message: metaDev
                },
                services: devWithUptime,
                meta: metaDev
            }
        } as StatusOperational
    } catch (error) {
        console.error('Error while fetching status')
        console.log(error)

        return fallback.degraded as StatusDegraded
    }
}

async function fetchServiceUptimeLastMonth(): Promise<Map<string, {
    uptimeLastMonth: number
    dailyStatusLastMonth: StatusDaily[]
}>> {
    const monthlyQuery = await loadSQL('fetchMonthlyUptimeByService.sql')
    const dailyQuery = await loadSQL('fetchDailyStatusLastMonthByService.sql')

    const [monthlyResult, dailyResult] = await Promise.all([
        run(monthlyQuery),
        run(dailyQuery),
    ])

    const byService = new Map<string, {
        uptimeLastMonth: number
        dailyStatusLastMonth: StatusDaily[]
    }>()

    for (const row of monthlyResult.rows ?? []) {
        const name = String(row.serviceName)
        byService.set(name, {
            uptimeLastMonth: Number.isFinite(Number(row.uptimeLastMonth)) ? Number(row.uptimeLastMonth) : 0,
            dailyStatusLastMonth: []
        })
    }

    for (const row of dailyResult.rows ?? []) {
        const name = String(row.serviceName)
        const daily = {
            date: String(row.date),
            uptime: Number.isFinite(Number(row.uptime)) ? Number(row.uptime) : 0,
            status: (row.status as ServiceStatusHuman) || 'inactive',
        }

        if (!byService.has(name)) {
            byService.set(name, {
                uptimeLastMonth: 0,
                dailyStatusLastMonth: [daily],
            })
            continue
        }

        byService.get(name)!.dailyStatusLastMonth.push(daily)
    }

    return byService
}

function enrichServicesWithUptime(
    services: { name: string, status: string }[],
    uptimeByService: Map<string, { uptimeLastMonth: number, dailyStatusLastMonth: StatusDaily[] }>
) {
    return services.map((service) => {
        const uptime = uptimeByService.get(service.name)

        return {
            ...service,
            uptimeLastMonth: uptime?.uptimeLastMonth ?? 0,
            dailyStatusLastMonth: uptime?.dailyStatusLastMonth ?? [],
        }
    })
}
