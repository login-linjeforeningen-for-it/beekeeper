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
    ownerUserId?: string | null
    ownerSessionId?: string | null
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
    expected_status: number | null
    interval: number
    note: string
    max_consecutive_failures: number
    port: number | null
}

type InternalDashboard = {
    statistics: InternalDashboardStatistics
    information: InternalDashboardInformation
    runtime: InternalDashboardRuntime
}

type InternalDashboardStatistics = {
    alerts: number
    databases: number
    sites: number
    monitored: number
    requestsToday: number
}

type InternalDashboardInformation = {
    primarySite: {
        id: number
        name: string
        ip: string
        primary: boolean
    }
    system: {
        ram: string
        processes: number
        disk: string
        load: string
        containers: number
    }
}

type InternalDashboardRuntime = {
    metrics: Stats
    docker: Docker
    databaseOverview: DatabaseOverviewResponse | null
}

type PrimarySite = {
    id: number
    name: string
    ip: string
    primary: boolean
}

type System = {
    ram: string
    processes: number
    disk: string
    load: string
    containers: number
}

type Stats = {
    system: {
        load: number[]
        memory: {
            used: number
            total: number
            percent: string
        }
        swap: string
        disk: string
        temperature: string
        powerUsage: string
        processes: number
        ipv4: string[]
        ipv6: string[]
        os: string
    }
}

type Docker = {
    status: 'available' | 'unavailable'
    count: number
    containers: DockerContainer[]
    error?: string | null
}

type DockerContainer = {
    id: string
    name: string
    status: string
    project: string
    deployment: {
        id: string
        name: string
        repoPath: string
        branch: string
        serviceUnit: string
        timerUnit: string
        autoDeployEnabled: boolean
        autoDeployActive: boolean
        serviceActive: boolean
        updateAvailable: boolean
        behindCount: number
        currentCommit: string | null
        upstreamCommit: string | null
        dirty: boolean
        reachable: boolean
        error: string | null
    } | null
}

type DatabaseOverviewAverageQuery = {
    lastMinute: number | null
    lastFiveMinutes: number | null
    lastHour: number | null
    lastDay: number | null
}

type DatabaseOverviewQuery = {
    database: string
    user: string | null
    application: string | null
    ageSeconds: number
    waitEventType: string | null
    query: string
}

type DatabaseOverviewTable = {
    schema: string
    name: string
    estimatedRows: number
    tableBytes: number
    indexBytes: number
    totalBytes: number
}

type DatabaseOverviewItem = {
    name: string
    sizeBytes: number
    tableCount: number
    activeQueries: number
    currentConnections: number
    longestQuerySeconds: number | null
    averageQuerySeconds: DatabaseOverviewAverageQuery
    largestTable: string | null
    tables: DatabaseOverviewTable[]
}

type DatabaseOverviewCluster = {
    id: string
    name: string
    project: string
    status: string
    databaseCount: number
    totalSizeBytes: number
    activeQueries: number
    currentConnections: number
    longestQuery: DatabaseOverviewQuery | null
    averageQuerySeconds: DatabaseOverviewAverageQuery
    databases: DatabaseOverviewItem[]
    error: string | null
}

type DatabaseOverviewResponse = {
    generatedAt: string
    clusterCount: number
    databaseCount: number
    totalSizeBytes: number
    activeQueries: number
    longestQuery: DatabaseOverviewQuery | null
    averageQuerySeconds: DatabaseOverviewAverageQuery
    clusters: DatabaseOverviewCluster[]
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

type AiConversationSummary = {
    id: string
    title: string
    originalClientName: string
    activeClientName: string
    ownerUserId: string | null
    ownerSessionId: string | null
    deletedAt: string | null
    shareToken: string | null
    sharedFromConversationId: string | null
    createdAt: string
    updatedAt: string
    lastMessagePreview: string | null
    lastMessageRole: 'system' | 'user' | 'assistant' | null
    messageCount: number
}

type AiStoredMessage = {
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    error: boolean
    clientName: string | null
    createdAt: string
}

type AiConversationRecord = AiConversationSummary & {
    messages: AiStoredMessage[]
}

type AiConversationRow = {
    id: string
    title: string
    original_client_name: string
    active_client_name: string
    owner_user_id: string | null
    owner_session_id: string | null
    deleted_at: string | null
    share_token: string | null
    shared_from_conversation_id: string | null
    created_at: string
    updated_at: string
    last_message_preview: string | null
    last_message_role: 'system' | 'user' | 'assistant' | null
    message_count: number
}

type AiMessageRow = {
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    error: boolean
    client_name: string | null
    created_at: string
}

type AiConversationOwner = {
    userId: string | null
    sessionId: string | null
}

type VulnerabilityCounts = {
    info: number
    low: number
    moderate: number
    high: number
    critical: number
}

type ProjectFinding = {
    repository: string
    folder: string
    summary: string
    vulnerabilities: VulnerabilityCounts
}

type VulnerabilityIdentifier = {
    name: string
    folder: string
    count: number
    time: number
}

type NotifiedVulnerabilities = {
    critical: VulnerabilityIdentifier[]
    high: VulnerabilityIdentifier[]
    medium: VulnerabilityIdentifier[]
}

type Expires = {
    vault: string
    title: string
    time: string
    seen: number
}

type ExpiresAlert = {
    hasExpired: Expires[]
    expiresNextWeek: Expires[]
    expiresNextMonth: Expires[]
}

type ProjectReport = {
    title: string
    description: string
    highestSeverity: 'critical' | 'high' | 'medium'
}

type SecretReport = {
    ping: boolean
    red: boolean
    finalReport: string
    secretsToReport: boolean
}

type JobState<T> = {
    enabled: boolean
    intervalMinutes: number
    lastStartedAt: string | null
    lastFinishedAt: string | null
    lastSuccessAt: string | null
    lastError: string | null
    result: T | null
}

type Scout = {
    updatedAt: string | null
    projectRoot: string
    projects: JobState<{
        repositories: string[]
        findings: ProjectFinding[]
        notified: NotifiedVulnerabilities
        report: ProjectReport | null
        alertSent: boolean
    }>
    onePassword: JobState<{
        categories: ExpiresAlert
        report: SecretReport | null
        alertSent: boolean
        vaultCount: number
        itemCount: number
    }>
}
