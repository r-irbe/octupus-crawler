// URL normalization property tests — determinism + idempotence
// Validates: REQ-CRAWL-002 (normalization is deterministic)
// Property for REQ-CRAWL-002: normalization shall be deterministic

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { parseCrawlUrl } from './crawl-url-factory.js';

// Arbitrary: valid http/https URLs
const arbHttpUrl = fc
  .record({
    scheme: fc.constantFrom('http', 'https'),
    host: fc.webUrl().map((u: string) => {
      try { return new URL(u).hostname; } catch { return 'example.com'; }
    }),
    path: fc.webPath(),
    params: fc.array(
      fc.record({
        key: fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
        value: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
      }),
      { minLength: 0, maxLength: 5 },
    ),
    fragment: fc.constantFrom('', '#section', '#top'),
  })
  .map(({ scheme, host, path, params, fragment }) => {
    const query = params.length > 0
      ? '?' + params.map((p) => `${p.key}=${p.value}`).join('&')
      : '';
    return `${scheme}://${host}${path}${query}${fragment}`;
  });

// Property for REQ-CRAWL-002: normalization is deterministic
describe('url-normalizer properties', () => {
  fcTest.prop([arbHttpUrl])(
    'determinism: normalize(x) === normalize(x)',
    (rawUrl: string) => {
      const result1 = parseCrawlUrl(rawUrl);
      const result2 = parseCrawlUrl(rawUrl);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.normalized).toBe(result2.value.normalized);
      } else {
        expect(result1.isErr()).toBe(result2.isErr());
      }
    },
  );

  // Property for REQ-CRAWL-002: idempotence
  fcTest.prop([arbHttpUrl])(
    'idempotence: normalize(normalize(x)) === normalize(x)',
    (rawUrl: string) => {
      const first = parseCrawlUrl(rawUrl);
      if (first.isErr()) return; // skip invalid

      const second = parseCrawlUrl(first.value.normalized);
      if (second.isErr()) return;

      expect(first.value.normalized).toBe(second.value.normalized);
    },
  );

  // Property for REQ-CRAWL-002: fragments are always stripped
  fcTest.prop([arbHttpUrl])(
    'fragments are stripped',
    (rawUrl: string) => {
      const result = parseCrawlUrl(rawUrl);
      if (result.isErr()) return;
      expect(result.value.normalized).not.toContain('#');
    },
  );

  // Property for REQ-CRAWL-001: only http/https pass
  fcTest.prop([
    fc.constantFrom('ftp', 'ws', 'wss', 'file', 'ssh', 'telnet'),
    fc.webUrl(),
  ])(
    'only http/https schemes pass',
    (scheme: string, url: string) => {
      try {
        const parsed = new URL(url);
        const modified = `${scheme}://${parsed.hostname}${parsed.pathname}`;
        const result = parseCrawlUrl(modified);
        expect(result.isErr()).toBe(true);
      } catch {
        // invalid URL, skip
      }
    },
  );
});
