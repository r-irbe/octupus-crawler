// Job ID property tests — determinism + idempotence
// Property for REQ-DIST-001: deriveJobId shall be deterministic for any URL
// Property for REQ-DIST-008: job ID shall be exactly 32 hex characters

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { deriveJobId } from './job-id.js';

// Arbitrary: realistic URL strings
const arbUrl = fc
  .record({
    scheme: fc.constantFrom('http', 'https'),
    host: fc.stringMatching(/^[a-z][a-z0-9]{1,15}\.[a-z]{2,4}$/),
    path: fc.array(fc.stringMatching(/^[a-z0-9]{1,10}$/), { minLength: 0, maxLength: 4 })
      .map((segments) => '/' + segments.join('/')),
    query: fc.constantFrom('', '?key=value', '?a=1&b=2'),
  })
  .map(({ scheme, host, path, query }) => `${scheme}://${host}${path}${query}`);

// Arbitrary: any non-empty string (stress test)
const arbAnyString = fc.string({ minLength: 1, maxLength: 500 });

describe('deriveJobId properties', () => {
  // Property for REQ-DIST-001: deterministic hash
  fcTest.prop([arbUrl])(
    'determinism: deriveJobId(x) === deriveJobId(x)',
    (url: string) => {
      expect(deriveJobId(url)).toBe(deriveJobId(url));
    },
  );

  // Property for REQ-DIST-008: always 32 hex chars
  fcTest.prop([arbAnyString])(
    'format: output is always 32 hex characters',
    (input: string) => {
      const id = deriveJobId(input);
      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    },
  );

  // Property for REQ-DIST-001: different inputs likely produce different IDs
  fcTest.prop([arbUrl, arbUrl])(
    'uniqueness: different URLs produce different IDs (when inputs differ)',
    (url1: string, url2: string) => {
      fc.pre(url1 !== url2);
      // With 128-bit hash, collision probability is negligible
      expect(deriveJobId(url1)).not.toBe(deriveJobId(url2));
    },
  );

  // Property for REQ-DIST-001: pure function (no side effects)
  fcTest.prop([arbUrl])(
    'purity: calling multiple times does not change result',
    (url: string) => {
      const first = deriveJobId(url);
      // Call many times to verify no mutation/state
      deriveJobId(url);
      deriveJobId(url);
      deriveJobId(url);
      expect(deriveJobId(url)).toBe(first);
    },
  );
});
