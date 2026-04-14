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

type GPT_ModelStatus = 'idle' | 'preparing' | 'generating' | 'error'

type GPT_ModelMetrics = {
    conversationId: string | null
    status: GPT_ModelStatus
    currentTokens: number
    maxTokens: number
    promptTokens: number
    generatedTokens: number
    contextTokens: number
    contextMaxTokens: number
    tps: number
    lastUpdated: string | null
    lastError: string | null
}

type GPT_Client = {
    name: string
    ram: GPT_RAM[]
    cpu: GPT_CPU[]
    gpu: GPT_GPU[]
    model: GPT_ModelMetrics
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

type GPT_ChatRole = 'system' | 'user' | 'assistant'

type GPT_ChatMessage = {
    role: GPT_ChatRole
    content: string
}

type GPT_PromptRequest = {
    type: 'prompt_request'
    conversationId: string
    clientName?: string
    messages: GPT_ChatMessage[]
    maxTokens?: number
    temperature?: number
}

type GPT_PromptEventType = 'prompt_started' | 'prompt_delta' | 'prompt_complete' | 'prompt_error'

type GPT_SocketState = {
    clientName: string | null
    role: 'producer' | 'observer'
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

type Monitoring = {
    id: number
    name: string
    enabled: boolean
    url: string
    port: number
    maxConsecutiveFailures: number
    bars: Bar[]
    uptime: string
    tags: string[]
    certificate?: Certificate
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
