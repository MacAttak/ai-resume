# Security Guidelines

This document outlines security practices, procedures, and guidelines for the AI-Resume application.

## Environment Variables & Secrets Management

### Local Development

**Pull environment variables from Vercel:**
```bash
npm run env:pull
```

This creates/updates `.env.local` with development environment variables from Vercel. All secrets are encrypted at rest in Vercel and pulled securely via the Vercel CLI.

**Important:**
- Never commit `.env.local` files to git
- The `.gitignore` file is configured to block all `.env*.local` files
- Use `.env.example` as a template for required variables

### Adding New Environment Variables

1. Add to Vercel Dashboard → Project Settings → Environment Variables
2. Select appropriate environments (Development, Preview, Production)
3. Mark as "Sensitive" for API keys and secrets
4. Update `.env.example` with a placeholder
5. Pull updates locally: `npm run env:pull`

### Secret Rotation Procedure

When rotating secrets (recommended quarterly or after potential exposure):

1. **Generate new secret** in the service dashboard (OpenAI, Clerk, Cal.com, etc.)
2. **Update in Vercel Dashboard:**
   - Navigate to Project Settings → Environment Variables
   - Click the variable to edit
   - Enter new value
   - Update for all environments (Development, Preview, Production)
3. **Revoke old secret** in the service dashboard
4. **Pull updated variables:** `npm run env:pull`
5. **Restart local development server:** `npm run dev`

**Services requiring rotation:**
- OpenAI API Key
- Clerk Secret Key
- Upstash Redis Token
- Cal.com API Key
- Cal.com Webhook Secret
- HoneyHive API Key

## Security Headers

Security headers are configured in [`vercel.json`](vercel.json) and applied at the Vercel CDN edge for optimal performance.

### Configured Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | DENY | Prevents clickjacking attacks |
| `X-Content-Type-Options` | nosniff | Prevents MIME sniffing |
| `Content-Security-Policy` | Restrictive policy | Prevents XSS, restricts resource loading |
| `Referrer-Policy` | strict-origin-when-cross-origin | Controls referrer information |
| `Permissions-Policy` | Restrictive | Disables unnecessary browser features |
| `Strict-Transport-Security` | max-age=63072000 | Forces HTTPS (added by Vercel) |

### Testing Security Headers

```bash
# Test production headers
curl -I https://chatwithdan.chat/ | grep -iE "(x-frame|content-security|x-content-type)"

# Test preview deployment headers
curl -I https://[your-preview-url].vercel.app/ | grep -iE "(x-frame|content-security)"
```

## Logging Best Practices

The application uses a secure logger ([`src/lib/logger.ts`](src/lib/logger.ts)) that automatically sanitizes PII (Personally Identifiable Information) from logs.

### Usage

```typescript
import { logger } from '@/lib/logger';

// PII will be automatically redacted
logger.info('User action', { 
  email: 'user@example.com',  // Will be ***REDACTED***
  name: 'John Doe',           // Will be ***REDACTED***
  action: 'login'             // Will be logged
});

// Error logging
logger.error('API request failed', error);

// Warning logging
logger.warn('Rate limit approaching', { userId, remaining: 5 });

// Debug logging (only in development)
logger.debug('Processing request', { requestId });
```

### Sanitized Fields

The following fields are automatically redacted:
- email, attendeeEmail
- phone, phoneNumber
- name, attendeeName
- password
- token, secret, apiKey
- authorization, cookie, session

### Never Log

- API keys or secrets
- Full credit card numbers
- Passwords or password hashes
- Social security numbers
- OAuth tokens

## Input Validation

### Message Length Limits

Chat messages are limited to 4,000 characters to prevent:
- DoS attacks via large payloads
- Memory exhaustion
- Database overflow

Enforced in: [`src/app/api/chat/stream/route.ts`](src/app/api/chat/stream/route.ts)

### Cal.com Booking Validation

All booking parameters are validated using Zod schemas:
- Email format validation
- Timezone validation (IANA format)
- Date/time validation (24-hour minimum notice)
- Required vs optional field enforcement

Enforced in: [`src/lib/cal-tools.ts`](src/lib/cal-tools.ts)

## Rate Limiting

### Production Limits

- **Per Minute:** 10 requests
- **Per Day:** 100 requests
- **Per User:** Isolated by Clerk user ID

### Testing Limits

- **Per Minute:** 1,000 requests
- **Per Day:** 10,000 requests

### Bypassing Rate Limits

Rate limits are enforced at the API level and cannot be bypassed without authentication. Attempts to circumvent rate limits are logged and may result in account suspension.

## Authentication & Authorization

### Clerk Integration

- All protected routes require authentication
- JWT tokens managed by Clerk
- Session cookies are HTTP-only and secure
- CSRF protection provided by Clerk

### Protected Routes

- `/chat` - Main chat interface
- `/api/*` - All API endpoints (except `/api/cal/webhook`)

### Public Routes

- `/` - Landing page
- `/api/cal/webhook` - Cal.com webhook (HMAC verified)

## Webhook Security

### Cal.com Webhook Verification

Webhooks use HMAC SHA-256 signature verification to ensure authenticity.

**Implementation:** [`src/app/api/cal/webhook/route.ts`](src/app/api/cal/webhook/route.ts)

```typescript
// Webhooks are verified using the CAL_WEBHOOK_SECRET
// Invalid signatures return 401 Unauthorized
// Replay attacks are mitigated by signature verification
```

## Vercel Security Features

### DDoS Protection

- Automatic Layer 3, 4, and 7 DDoS mitigation
- Available on all Vercel plans (including Hobby)
- No configuration required

### Web Application Firewall (WAF)

- Basic WAF protection on all plans
- Automatic threat detection and mitigation
- Configure in: Vercel Dashboard → Security → Firewall

### Attack Challenge Mode

During high-traffic or attack scenarios:
1. Navigate to Vercel Dashboard → Security → Firewall
2. Enable "Attack Challenge Mode"
3. Legitimate users will pass browser challenges
4. Malicious traffic will be blocked

## Incident Response

### Secret Leak Response

If a secret is compromised or accidentally exposed:

1. **Immediate Action:**
   ```bash
   # Rotate the compromised secret immediately
   # 1. Generate new secret in service dashboard
   # 2. Update in Vercel Dashboard for all environments
   # 3. Revoke old secret
   # 4. Pull new secret locally
   npm run env:pull
   ```

2. **Verification:**
   - Check git history for exposure: `git log -p | grep -i "secret\|key\|token"`
   - Check Vercel deployment logs
   - Review access logs for unauthorized usage

3. **Notification:**
   - Inform security team
   - Document incident
   - Update this security document if process changes

### Security Issue Reporting

**Report security issues to:** security@chatwithdan.com

**DO NOT** open public GitHub issues for security vulnerabilities.

**Include in your report:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Compliance

### GDPR

- PII is automatically sanitized from logs
- Conversation data expires after 7 days (auto-deleted from Redis)
- Users can request data deletion via Clerk account management

### Data Retention

| Data Type | Retention Period | Storage Location |
|-----------|------------------|------------------|
| Conversation history | 7 days | Upstash Redis |
| User data (name, email) | Managed by Clerk | Clerk infrastructure |
| Meeting bookings | Managed by Cal.com | Cal.com infrastructure |
| Application logs | 7 days | Vercel logs |

## Security Checklist

### For Developers

- [ ] Never commit `.env.local` files
- [ ] Use sanitized logger for all logging
- [ ] Validate all user inputs with Zod schemas
- [ ] Mark sensitive environment variables as "Sensitive" in Vercel
- [ ] Pull environment variables before local development
- [ ] Review security headers in preview deployments
- [ ] Run tests before merging: `npm run test:all`

### For Production Deployments

- [ ] Verify all environment variables are set in Production environment
- [ ] Test security headers: `curl -I https://chatwithdan.chat/`
- [ ] Verify rate limiting is active
- [ ] Check Vercel Dashboard → Security for any alerts
- [ ] Monitor application logs for anomalies
- [ ] Verify WAF is enabled

### Quarterly Security Review

- [ ] Rotate all secrets (every 90 days)
- [ ] Review Vercel access logs for anomalies
- [ ] Update dependencies: `npm audit`
- [ ] Review and update security headers
- [ ] Test incident response procedures
- [ ] Review GDPR compliance

## Additional Resources

- [Vercel Security Documentation](https://vercel.com/security)
- [Clerk Security Documentation](https://clerk.com/docs/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#security)

## Version History

- **v1.0.0** (2025-11-24): Initial security documentation with Vercel secrets management, PII sanitization, and security headers
