# OWASP Security Checklist

- A01 Broken Access Control: mitigated via role guard pada route `admin` dan `teacher`
- A02 Cryptographic Failures: mitigated via bcrypt hash dan JWT access/refresh
- A03 Injection: mitigated via Drizzle ORM parameterized query dan Zod validation
- A04 Insecure Design: mitigated via PostgreSQL rate limiting dan session rotation
- A05 Security Misconfiguration: mitigated via Helmet, strict CORS, Nginx headers
- A06 Vulnerable Components: mitigated via `npm audit` dalam CI policy
- A07 Auth & Session Failures: mitigated via refresh token rotation, revoke all sessions, httpOnly cookie
- A08 Software & Data Integrity Failures: mitigated via checksum/magic byte validation upload
- A09 Logging & Monitoring Failures: mitigated via structured logging, request id, metrics, audit trail
- A10 SSRF: mitigated via whitelist URL eksternal untuk integrasi keluar

Status verifikasi runtime production: pending.
