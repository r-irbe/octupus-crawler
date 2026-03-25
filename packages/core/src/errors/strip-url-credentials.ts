// URL credential stripping — removes userinfo from URLs for safe error messages
// Implements: T-ARCH-033, Review finding S-2 (URL creds in errors)

/**
 * Strips credentials (user:pass) from a URL string.
 * Returns the URL with credentials replaced by '***'.
 * If parsing fails, returns the original string (no credentials to strip).
 */
export function stripUrlCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.username && !parsed.password) {
      return url;
    }
    parsed.username = '***';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
}
