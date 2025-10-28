# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Keplear seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **[INSERT SECURITY EMAIL]**

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** (what an attacker could achieve)
- **Suggested fix** (if you have one)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Resolution Target:** Within 30 days (depending on severity)

### What to Expect

After you submit a report, you can expect:

1. **Acknowledgment** of your report within 48 hours
2. **Regular updates** on the progress of addressing the vulnerability
3. **Notification** when the vulnerability is fixed
4. **Credit** in the release notes (if desired)

## Security Best Practices

### For Users

1. **Keep dependencies updated**

   ```bash
   npm audit
   npm audit fix
   ```

2. **Never commit sensitive data**
   - API keys
   - Passwords
   - Private tokens
   - `.env` files

3. **Use environment variables**
   - Store sensitive data in `.env`
   - Never hardcode credentials
   - Use `.env.example` as template

4. **Enable two-factor authentication** on your GitHub account

### For Contributors

1. **Review code for security issues** before submitting PRs
2. **Use proper authentication** (Supabase handles this)
3. **Sanitize user inputs** in all forms
4. **Validate data** on both client and server
5. **Follow OWASP guidelines** for web security

## Known Security Considerations

### Supabase Anon Key

The Supabase anonymous key (`VITE_SUPABASE_ANON_KEY`) is **safe to expose** in client-side code because:

- Row Level Security (RLS) policies protect data
- The key only allows authorized operations
- It's designed for public client applications

However, **never expose**:

- Service role keys
- Database passwords
- Private API keys

### Content Security Policy

This application uses Vite's built-in CSP headers in production. Additional headers can be configured in `vite.config.ts`:

```typescript
server: {
  headers: {
    'Content-Security-Policy': "default-src 'self'"
  }
}
```

### Cross-Site Scripting (XSS)

- React automatically escapes JSX content
- User input is sanitized before rendering
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary

### Cross-Site Request Forgery (CSRF)

- Supabase handles CSRF protection
- Authentication tokens are securely managed
- All mutations require authentication

## Dependency Security

### Automated Scanning

We use GitHub's Dependabot to:

- Scan for vulnerable dependencies
- Automatically create PRs for security updates
- Alert maintainers of critical vulnerabilities

### Manual Auditing

Run security audits regularly:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Fix all issues (may introduce breaking changes)
npm audit fix --force
```

## Secure Development Checklist

Before deploying to production:

- [ ] All dependencies are up to date
- [ ] No `npm audit` vulnerabilities
- [ ] Environment variables are properly configured
- [ ] No sensitive data in code or commits
- [ ] Authentication is working correctly
- [ ] HTTPS is enforced in production
- [ ] CSP headers are configured
- [ ] Error messages don't leak sensitive info
- [ ] Input validation is comprehensive
- [ ] XSS protection is in place

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed. Updates are announced via:

- GitHub Security Advisories
- Release notes (CHANGELOG.md)
- Email to reporters (if applicable)

## Bug Bounty Program

Currently, we do not have a bug bounty program. However, we deeply appreciate security researchers who responsibly disclose vulnerabilities and will:

- Acknowledge your contribution
- Credit you in release notes (if desired)
- Provide updates on the fix

## Additional Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [React Security Best Practices](https://react.dev/learn/keeping-components-pure)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

**Last Updated:** January 2025
**Contact:** [INSERT SECURITY EMAIL]
