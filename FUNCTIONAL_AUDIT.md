# Functional Audit — Initial Findings

Date: May 29, 2026

Scope: `apps/api` backend and `apps/web` frontend interaction points (auth, profile, courses)

Summary — High priority issues

1. JWT secret default & production safety
   - `server.js` warns and exits if `JWT_SECRET` is default in production. Good guard but verify all deployments set a secure secret.
   - Several routes use `jwt.verify` ad-hoc; centralizing authentication via middleware (`authenticate`) would reduce duplicated parsing and potential inconsistencies.

2. Missing request validation
   - Many endpoints accept raw `req.body` fields without schema validation. Add `express-validator` or `Joi` to validate inputs (register, login, generate questions, etc.) to prevent malformed data and injection.

3. Rate limiting & security headers
   - Added `helmet` and a basic `express-rate-limit` instance to `server.js` to mitigate simple abuse.

4. Error handling & logging
   - Error handlers frequently return `error.message` with limited logging. Improve with structured logging (winston/pino) and avoid leaking internal errors in production (sanitize messages).

5. OptionalAuth swallowing errors silently
   - `optionalAuth` ignores token parse errors silently; log debug-level warnings to help troubleshooting.

6. Authentication checks scattered across routes
   - Many endpoints manually extract and verify tokens. Refactor to use `authenticate` middleware and `req.user` to simplify and ensure consistent auth behavior.

7. MongoDB connection behavior
   - `connectMongo()` logs helpful messages; production forces a connection. Ensure correct environment setup and consider exponential backoff / retry for transient errors.

8. Background tasks & email
   - OTP email sending is fire-and-forget; failures are logged but not retried. Implement a retry or a queue (e.g., Bull) for reliability.

9. Cookie security & CSRF
   - Cookies are set with `sameSite` `none` in production; ensure TLS/HTTPS in production and consider CSRF protections for cookie-based auth.

10. Input.size & payloads
   - Express body limits are 50MB. Ensure this is intentional (for file uploads) and consider stricter limits for sensitive endpoints.

Immediate remediation steps applied
- Added `helmet` and a basic rate limiter to `server.js`.

Recommended next engineering steps (priority order)
1. Centralize token verification: replace duplicated `jwt.verify` calls with `authenticate` middleware across protected routes.
2. Add request validation: use `Joi` or `express-validator` for all POST/PATCH endpoints.
3. Improve logging: add `winston` or `pino`, log stack traces on errors in non-production, and sanitize user-facing error messages.
4. Add retry/queue for outbound email and long-running background jobs.
5. Harden cookie/session settings and add CSRF protection for mutating routes where cookies are used.
6. Write integration tests for auth flows and profile endpoints.

Planned automated checks next
- Run a static grep for manual `jwt.verify` usages and replace with middleware.
- Scan routes for missing input validation patterns.
- Run lightweight integration tests against `/api/health`, `/api/auth/login`, `/api/profile/me` to capture current responses (requires running server).

I'll proceed to scan for `jwt.verify` occurrences and to create quick refactor suggestions. 
