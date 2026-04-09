type Service = {
    context: string
    name: string
    status: string
    service_status: ServiceStatusHuman
    age: string
}

type LocalLog = {
    context: string
    namespace: string
    id: string
    name: string
    event: string
    status: ServiceStatusHuman
    command: string
    timestamp: string
}

type DomainsWithStatus = {
    id: string
    name: string
    url: string
    context: string
    namespace: string
    status: number
}

type ServiceAsList = {
    context: string
    name: string
    status: string
    service_status: ServiceStatusHuman
    age: string
}

type ServiceStatusHuman = 'operational' | 'degraded' | 'down' | 'inactive'

type Domain = {
    id: string
    name: string
    url: string
    context: string
    namespace: string
}

type StatusCache = {
    age: number
    data: {
        prod: {
            status: {
                number: number
                message: string
            },
            services: Service[]
            meta: string
        },
        dev: {
            status: {
                number: number
                message: string
            },
            services: Service[]
            meta: string
        }
    } | null
    refresh: number
}

type StatusStarting = {
    prod: {
        status: {
            number: number
            message: string
            info: string
        },
        services: { name: string, status: ServiceStatusHuman }[]
        meta: ServiceStatusHuman
    }
    dev: {
        status: {
            number: number
            message: string
            info: string
        }
        services: { name: string, status: ServiceStatusHuman }[]
        meta: ServiceStatusHuman
    }
}

type StatusDegraded = {
    prod: {
        status: {
            number: number
            message: string
            error: string
        },
        services: never[]
        meta: ServiceStatusHuman
    }
    dev: {
        status: {
            number: number
            message: string
            error: string
        }
        services: never[]
        meta: ServiceStatusHuman
    }
}

type StatusOperational = {
    prod: {
        status: {
            number: number
            message: ServiceStatusHuman
        },
        services: { name: string, status: ServiceStatusHuman }[]
        meta: ServiceStatusHuman
    }
    dev: {
        status: {
            number: number
            message: ServiceStatusHuman
        },
        services: { name: string, status: ServiceStatusHuman }[]
        meta: string
    }
}

type Status = StatusOperational | StatusStarting | StatusDegraded

type CheckedServiceStatus = {
    id: number
    name: string
    type: string
    url: string
    notification: number
    interval: number
    expected_down: boolean
    upside_down: boolean
    max_consecutive_failures: number
    note: string
    notified: null | boolean
    tags: Tag[]
    enabled: boolean
    service_id: number
    notification_id: null | number
    notification_name: null | string
    notification_message: null | string
    notification_webhook: null | string
    bars: Bar[]
}

type Bar = {
    status: boolean
    delay: number
    expectedDown: boolean
    timestamp: string
    note: string
}

type MonitoredService = {
    id: string
    name: string
    type: MonitoredServiceType
    url: string
    notification: number
    interval: number
    expected_down: boolean
    upside_down: boolean
    user_agent: string | null
    max_consecutive_failures: number
    note: string | null
    notified: string
    tags: string[]
    enabled: boolean
    port: number | null
}

type MonitoredServiceType = 'fetch' | 'post' | 'tcp'

type ServiceNotification = {
    name: string
    message: string
    webhook: string
}

type Certificate = {
    valid: true
    subjectCN: string
    issuer: {
        cn: string
        name: string
    }
    validFrom: string
    validTo: string
    keyType: string
    signatureAlgorithm: string | undefined
    publicKeyAlgorithm: string
    dnsNames: string
    raw: {
        subject: object
        issuer: object
        subjectaltname: string
        infoAccess: object
        ca: boolean
        modulus: unknown | undefined
        exponent: unknown | undefined
        pubkey: Buffer
        bits: number
        valid_from: string
        valid_to: string
        fingerprint: string
        fingerprint256: string
        fingerprint512: string
        ext_key_usage: unknown[]
        serialNumber: string
        raw: Buffer
        asn1Curve: string
        nistCurve: string
        issuerCertificate: object[]
    }
}

type InvalidCertificate = {
    valid: false
    message: string
    reason?: string
    code?: string
    service: string
}

type DetailedService = {
    id: number
    uptime: number
    type: string
    name: string
    enabled: boolean
    tags: { id: number, name: string }[]
    bars: Bar[]
    url: string
    status: boolean
    expected_down: boolean
    upside_down: boolean
    user_agent: string | null
    interval: number
    note: string
    max_consecutive_failures: number
    port: number | null
}

type InternalDashboard = {
    statistics: InternalDashboardStatistics
    information: InternalDashboardInformation
}

type InternalDashboardStatistics = {
    alerts: number
    backups: number
    sites: number
    kubernetes: number
    monitored: number
    requestsToday: number
}

type InternalDashboardInformation = {
    primarySite: {
        id: number
        name: string
        ip: string
    }
    system: {
        ram: string
        processes: number
        disk: string
        load: string
        containers: number
    }
}

type PrimarySite = {
    id: number
    name: string
    ip: string
}

type System = {
    ram: string
    processes: number
    disk: string
    load: string
    containers: number
}

type GPT_Client = {
    name: string
    ram: GPT_RAM[]
    cpu: GPT_CPU[]
    gpu: GPT_GPU[]
}

type GPT_RAM = {
    name: string
    load: number
}

type GPT_CPU = {
    name: string
    load: number
}

type GPT_GPU = {
    name: string
    load: number
}
