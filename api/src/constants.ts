const requiredEnvironmentVariables = [
    'BASE_URL'
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

const config = {
    USERINFO_URL: `${process.env.BASE_URL}/application/o/userinfo/`
}

export default config
