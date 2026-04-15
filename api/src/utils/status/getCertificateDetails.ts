import tls from 'node:tls'
import { X509Certificate } from 'node:crypto'
import { URL } from 'node:url'
import classifyKeyType from './classifyKeyType.ts'

export async function getCertificateDetails(
    service: MonitoredService
): Promise<Certificate | InvalidCertificate> {
    return new Promise((resolve) => {
        let hostname: string
        let port: number

        try {
            const url = new URL(service.url)
            hostname = url.hostname
            port = Number(url.port) || 443
        } catch {
            return resolve({
                valid: false,
                message: 'Invalid URL',
                service: service.url
            })
        }

        const socket = tls.connect(
            {
                host: hostname,
                port,
                servername: hostname,
                rejectUnauthorized: false
            },
            () => {
                try {
                    const certificate = socket.getPeerCertificate(true)

                    if (!certificate || Object.keys(certificate).length === 0 || !certificate.raw) {
                        socket.end()
                        return resolve({
                            valid: false,
                            message: 'No certificate information available',
                            service: service.url
                        })
                    }

                    const x509 = new X509Certificate(certificate.raw)

                    socket.end()

                    resolve({
                        valid: true,
                        subjectCN: firstString(certificate.subject?.CN),
                        issuer: {
                            cn: firstString(certificate.issuer?.CN),
                            name: firstString(certificate.issuer?.O)
                        },
                        validFrom: certificate.valid_from ?? 'Unknown',
                        validTo: certificate.valid_to ?? 'Unknown',
                        keyType: classifyKeyType(certificate),
                        signatureAlgorithm: getSignatureAlgorithm(x509),
                        publicKeyAlgorithm: x509.publicKey.asymmetricKeyType ?? 'Unknown',
                        dnsNames: certificate.subjectaltname ?? '',
                        raw: normalizeRawCertificate(certificate)
                    })
                } catch (err) {
                    socket.end()
                    return resolve({
                        valid: false,
                        message: 'Certificate could not be read',
                        reason: err instanceof Error ? err.message : String(err),
                        service: service.url
                    })
                }
            }
        )

        socket.on('error', (err: NodeJS.ErrnoException) => {
            resolve({
                valid: false,
                message: 'TLS connection failed',
                reason: err.message,
                code: err.code,
                service: service.url
            })
        })

        socket.setTimeout(10000, () => {
            socket.destroy()
            resolve({
                valid: false,
                message: 'Connection timed out',
                service: service.url
            })
        })
    })
}

function firstString(value: string | string[] | undefined): string {
    if (!value) return 'Unknown'
    return Array.isArray(value) ? value[0] : value
}

function getSignatureAlgorithm(x509: X509Certificate): string | undefined {
    const maybeWithSignature = x509 as X509Certificate & {
        signatureAlgorithm?: string
    }

    return maybeWithSignature.signatureAlgorithm
}

function normalizeRawCertificate(
    certificate: tls.DetailedPeerCertificate
): Certificate['raw'] {
    return {
        subject: certificate.subject ?? {},
        issuer: certificate.issuer ?? {},
        subjectaltname: certificate.subjectaltname ?? '',
        infoAccess: certificate.infoAccess ?? {},
        ca: certificate.ca ?? false,
        modulus: certificate.modulus,
        exponent: certificate.exponent,
        pubkey: certificate.pubkey ?? Buffer.alloc(0),
        bits: certificate.bits ?? 0,
        valid_from: certificate.valid_from ?? 'Unknown',
        valid_to: certificate.valid_to ?? 'Unknown',
        fingerprint: certificate.fingerprint ?? '',
        fingerprint256: certificate.fingerprint256 ?? '',
        fingerprint512: certificate.fingerprint512 ?? '',
        ext_key_usage: certificate.ext_key_usage ?? [],
        serialNumber: certificate.serialNumber ?? '',
        raw: certificate.raw ?? Buffer.alloc(0),
        asn1Curve: certificate.asn1Curve ?? '',
        nistCurve: certificate.nistCurve ?? '',
        issuerCertificate: normalizeIssuerCertificates(certificate.issuerCertificate)
    }
}

function normalizeIssuerCertificates(
    issuerCertificate: tls.DetailedPeerCertificate | tls.DetailedPeerCertificate[] | undefined
): object[] {
    if (!issuerCertificate) return []

    if (Array.isArray(issuerCertificate)) {
        return issuerCertificate.map((cert) => normalizeIssuerCertificate(cert))
    }

    return [normalizeIssuerCertificate(issuerCertificate)]
}

function normalizeIssuerCertificate(cert: tls.DetailedPeerCertificate): object {
    return {
        subject: cert.subject ?? {},
        issuer: cert.issuer ?? {},
        subjectaltname: cert.subjectaltname ?? '',
        infoAccess: cert.infoAccess ?? {},
        ca: cert.ca ?? false,
        modulus: cert.modulus,
        exponent: cert.exponent,
        pubkey: cert.pubkey ?? Buffer.alloc(0),
        bits: cert.bits ?? 0,
        valid_from: cert.valid_from ?? 'Unknown',
        valid_to: cert.valid_to ?? 'Unknown',
        fingerprint: cert.fingerprint ?? '',
        fingerprint256: cert.fingerprint256 ?? '',
        fingerprint512: cert.fingerprint512 ?? '',
        ext_key_usage: cert.ext_key_usage ?? [],
        serialNumber: cert.serialNumber ?? '',
        raw: cert.raw ?? Buffer.alloc(0),
        asn1Curve: cert.asn1Curve ?? '',
        nistCurve: cert.nistCurve ?? ''
    }
}
