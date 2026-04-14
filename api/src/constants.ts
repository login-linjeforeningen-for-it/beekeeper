const requiredEnvironmentVariables = [
    'DB',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'CLIENT_ID',
    'CLIENT_SECRET',
    'REDIRECT_URI',
    'BASE_URL',
    'BEEKEEPER_URL',
    'AUTHENTIK_TOKEN',
    'BTG_TOKEN',
    'WEBHOOK_URL',
    'CRITICAL_ROLE',
    'CRITICAL_DEVELOPMENT_ROLE',
    'TRAFFIC_SECRET'
]

const missingVariables = requiredEnvironmentVariables.filter(
    (key) => !process.env[key]
)

if (missingVariables.length > 0) {
    throw new Error(
        'Missing essential environment variables:\n' +
        missingVariables
            .map((key) => `${key}: ${process.env[key] || 'undefined'}`)
            .join('\n')
    )
}

const env = Object.fromEntries(
    requiredEnvironmentVariables.map((key) => [key, process.env[key]])
)

const AUTH_URL = `${env.BASE_URL}/application/o/authorize/`
const TOKEN_URL = `${env.BASE_URL}/application/o/token/`
const USERINFO_URL = `${env.BASE_URL}/application/o/userinfo/`
const USER_ENDPOINT = `${env.BASE_URL}/api/v3/core/users/`

const config = {
    DB_PORT: env.DB_PORT,
    DB_MAX_CONN: env.DB_MAX_CONN,
    DB_IDLE_TIMEOUT_MS: env.DB_IDLE_TIMEOUT_MS,
    DB_TIMEOUT_MS: env.DB_TIMEOUT_MS,
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
    DOCTL_TOKEN: env.DOCTL_TOKEN,
    DB: env.DB,
    DB_HOST: env.DB_HOST,
    DB_USER: env.DB_USER,
    DB_PASSWORD: env.DB_PASSWORD,
    CLIENT_ID: env.CLIENT_ID,
    CLIENT_SECRET: env.CLIENT_SECRET,
    REDIRECT_URI: env.REDIRECT_URI,
    AUTH_URL,
    TOKEN_URL,
    USERINFO_URL,
    beekeeper: env.BEEKEEPER_URL,
    USER_ENDPOINT,
    AUTHENTIK_TOKEN: env.AUTHENTIK_TOKEN,
    BTG_TOKEN: env.BTG_TOKEN,
    CRITICAL_ROLE: env.CRITICAL_ROLE,
    CRITICAL_DEVELOPMENT_ROLE: env.CRITICAL_DEVELOPMENT_ROLE,
    WEBHOOK_URL: env.WEBHOOK_URL,
    DEFAULT_RESULTS_PER_PAGE: Number(env.DEFAULT_RESULTS_PER_PAGE) || 50,
    DEFAULT_CLUSTER: 'infra-prod-cluster',
    WARN_SLOW_QUERY_MS: 5000,
    TIMEOUT_MS: 30000,
    TRAFFIC_SECRET: env.TRAFFIC_SECRET,
    cache: {
        ttl: 60000
    },
    max: {
        attempts: 5,
        concurrency: 5
    },
    internal: 'https://internal.login.no/api',
    workerbee: 'https://workerbee.login.no/api/v2'
}

export default config
