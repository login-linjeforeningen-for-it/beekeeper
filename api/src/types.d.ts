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

type MonitoringProbe = {
    name: string
    url: string
    status: boolean
    delay: number
    expectedStatus?: number
    actualStatus?: number
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
    expected_status: number | null
    max_consecutive_failures: number
    note: string | null
    notified: string
    tags: string[]
    enabled: boolean
    port: number | null
    notification_policy_id?: number | null
    notification_policy_name?: string | null
    notification_policy_message?: string | null
    notification_policy_webhook?: string | null
}

type MonitoredServiceType = 'fetch' | 'post' | 'tcp'

type ServiceNotification = {
    id: number
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
    expected_status: number | null
    interval: number
    note: string
    max_consecutive_failures: number
    port: number | null
}

type Monitoring = {
    id: number
    name: string
    type: MonitoredServiceType
    enabled: boolean
    url: string
    port: number
    notification: number | null
    notificationPolicy?: ServiceNotification | null
    interval: number
    expectedDown: boolean
    upsideDown: boolean
    userAgent: string | null
    expectedStatus: number | null
    note: string | null
    notified: string | null
    maxConsecutiveFailures: number
    bars: Bar[]
    uptime: string
    tags: string[]
    certificate?: Certificate
    checks?: MonitoringProbe[]
}

type Bar = {
    status: boolean
    delay: number
    expectedDown: boolean
    upsideDown: boolean
    note: string | null
    timestamp: string
}

type Certificate = {
    valid: boolean
    message: string
    service: string
}
