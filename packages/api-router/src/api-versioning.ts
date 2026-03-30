// API versioning middleware — URL-prefix routing + deprecation telemetry
// Implements: T-COMM-009 (REQ-COMM-007)
// Pattern: /api/v1/ prefix — deprecated versions emit telemetry before removal
// Wire into Fastify: app.register(versioningPlugin, { currentVersion: 'v1' })

import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

/** Supported API versions in order of introduction. */
export const API_VERSIONS = ['v1'] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];

/** Version extracted from request path. */
export type VersionMatch = {
  readonly version: ApiVersion;
  readonly deprecated: boolean;
  readonly remainingPath: string;
};

type VersionError =
  | { readonly _tag: 'UnsupportedVersion'; readonly requested: string }
  | { readonly _tag: 'MissingVersion' };

/** Current (latest) API version. */
export const CURRENT_VERSION: ApiVersion = 'v1';

/** Versions that are deprecated but still served. Add here before removal. */
const DEPRECATED_VERSIONS: ReadonlySet<string> = new Set<string>();

const VERSION_PREFIX = /^\/api\/(v\d+)(\/.*)?$/;

/** Extract API version from URL path.
 *  Returns the matched version, whether it's deprecated, and the remaining path.
 */
export function extractVersion(path: string): Result<VersionMatch, VersionError> {
  const match = VERSION_PREFIX.exec(path);
  if (!match) {
    return err({ _tag: 'MissingVersion' as const });
  }

  const requested = match[1];
  if (!requested) {
    return err({ _tag: 'MissingVersion' as const });
  }

  const isKnown = (API_VERSIONS as readonly string[]).includes(requested);
  if (!isKnown) {
    return err({ _tag: 'UnsupportedVersion' as const, requested });
  }

  const version = requested as ApiVersion;
  return ok({
    version,
    deprecated: DEPRECATED_VERSIONS.has(version),
    remainingPath: match[2] ?? '/',
  });
}

/** Deprecation headers per RFC 8594 for deprecated API versions. */
export function deprecationHeaders(version: ApiVersion): Record<string, string> {
  if (!DEPRECATED_VERSIONS.has(version)) {
    return {};
  }
  return {
    Deprecation: 'true',
    Link: `</api/${CURRENT_VERSION}>; rel="successor-version"`,
  };
}
