const requiredEnvironmentVariables = [
    'BASE_URL',
    'BTG_TOKEN',
    'WEBHOOK_URL',
    'CRITICAL_ROLE'
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
    [...requiredEnvironmentVariables]
        .map((key) => [key, process.env[key]])
)

const config = {
    USERINFO_URL: `${env.BASE_URL}/application/o/userinfo/`,
    BTG_TOKEN: env.BTG_TOKEN,
    CRITICAL_ROLE: env.CRITICAL_ROLE,
    WEBHOOK_URL: env.WEBHOOK_URL
}

export default config
