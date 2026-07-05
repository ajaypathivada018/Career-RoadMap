/**
 * Extract JWT from Authorization header or HttpOnly cookie.
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.cookies?.Career_Sync_token || null;
}
