# Security Policy

## Supported Versions
We currently support and provide security updates for:
- **v1.0.1** (Latest stable)

## Reporting a Vulnerability
If you discover a security vulnerability, please help us keep the Stellar ecosystem safe:

1. **Private Reporting**: Do NOT open a public issue.
2. **Email**: Send details to **lewechigodsfavour@gmail.com**.
3. **Response**: We will acknowledge your report within 48 hours and coordinate a fix.

Thank you for helping us maintain a secure library.

## Security Audit Checklist
When reviewing or adding new features, please ensure the following checklist is completed:
- [ ] Dependencies are scanned for vulnerabilities via `pnpm audit` (Automated in CI).
- [ ] No hardcoded secrets (API keys, passwords) are present in the codebase.
- [ ] Environment variables are properly documented in `.env.example`.
- [ ] Input validation is applied for all user inputs.
- [ ] Authentication and Authorization checks are verified.
- [ ] Sensitive data is properly encrypted in transit and at rest.
