/**
 * Built-in Scenarios — Pre-configured route handlers for common test cases.
 *
 * @see REQ-K8E-013, REQ-K8E-014
 */

import type { SimulatorRoute, SimulatorRequest, SimulatorResponse } from './web-simulator.js';

/** Slow response: /slow?ms=N — delays N ms before responding. REQ-K8E-013 */
export const slowResponseRoute: SimulatorRoute = {
  path: '/slow',
  handler: (req: SimulatorRequest): SimulatorResponse => {
    const url = new URL(req.url, 'http://localhost');
    const ms = parseInt(url.searchParams.get('ms') ?? '1000', 10);
    const delay = Number.isFinite(ms) && ms > 0 ? Math.min(ms, 30_000) : 1000;
    return {
      status: 200,
      body: `<html><body>Slow response (${String(delay)}ms)</body></html>`,
      delay,
    };
  },
};

/** HTTP error: /error?code=N — returns specified status code. REQ-K8E-013 */
export const httpErrorRoute: SimulatorRoute = {
  path: '/error',
  handler: (req: SimulatorRequest): SimulatorResponse => {
    const url = new URL(req.url, 'http://localhost');
    const code = parseInt(url.searchParams.get('code') ?? '500', 10);
    const status = code >= 100 && code < 600 ? code : 500;
    return {
      status,
      body: `<html><body>Error ${String(status)}</body></html>`,
    };
  },
};

/** Redirect chain: /redirect?hops=N — N redirects before final 200. REQ-K8E-013 */
export const redirectChainRoute: SimulatorRoute = {
  path: '/redirect',
  handler: (req: SimulatorRequest): SimulatorResponse => {
    const url = new URL(req.url, 'http://localhost');
    const hops = parseInt(url.searchParams.get('hops') ?? '1', 10);
    const remaining = Number.isFinite(hops) && hops > 0 ? Math.min(hops, 20) : 0;

    if (remaining > 0) {
      return {
        status: 302,
        headers: { Location: `/redirect?hops=${String(remaining - 1)}` },
        body: '',
      };
    }

    return {
      status: 200,
      body: '<html><body>Final destination</body></html>',
    };
  },
};

/** Link trap: /trap?depth=N — infinite-depth pages. REQ-K8E-013 */
export const linkTrapRoute: SimulatorRoute = {
  path: '/trap',
  handler: (req: SimulatorRequest): SimulatorResponse => {
    const url = new URL(req.url, 'http://localhost');
    const depth = parseInt(url.searchParams.get('depth') ?? '0', 10);
    const d = Number.isFinite(depth) && depth >= 0 ? depth : 0;
    const next = d + 1;

    return {
      status: 200,
      body: [
        '<html><body>',
        `<h1>Trap depth ${String(d)}</h1>`,
        `<a href="/trap?depth=${String(next)}">Go deeper</a>`,
        '</body></html>',
      ].join(''),
    };
  },
};

/**
 * SSRF bait page: /ssrf-links — contains links to reserved IPs.
 * Used to test that the crawler's SSRF guard rejects these.
 * @see REQ-K8E-019
 */
export const ssrfBaitRoute: SimulatorRoute = {
  path: '/ssrf-links',
  handler: (): SimulatorResponse => ({
    status: 200,
    body: [
      '<html><body>',
      '<h1>SSRF Bait Page</h1>',
      '<a href="http://169.254.169.254/latest/meta-data/">AWS metadata</a>',
      '<a href="http://127.0.0.1:6379/">Localhost Redis</a>',
      '<a href="http://[::1]:8080/">IPv6 loopback</a>',
      '<a href="http://10.0.0.1/internal">Private network</a>',
      '<a href="http://192.168.1.1/admin">Private network 2</a>',
      '</body></html>',
    ].join('\n'),
  }),
};

/**
 * Robots.txt block route: /robots-block — serves Disallow rules.
 * Tests crawler compliance with robots.txt directives.
 * @see REQ-K8E-038
 */
export const robotsTxtBlockRoute: SimulatorRoute = {
  path: '/robots-block',
  handler: (): SimulatorResponse => ({
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: [
      'User-agent: *',
      'Disallow: /admin',
      'Disallow: /private',
      'Crawl-delay: 1',
      '',
      'User-agent: ipf-crawler',
      'Disallow: /secret',
      'Allow: /admin/public',
    ].join('\n'),
  }),
};

/**
 * Rate limit route: /rate-limit — returns 429 with Retry-After header.
 * @see REQ-K8E-034
 */
export const rateLimitRoute: SimulatorRoute = {
  path: '/rate-limit',
  handler: (req: SimulatorRequest): SimulatorResponse => {
    const url = new URL(req.url, 'http://localhost');
    const raw = parseInt(url.searchParams.get('retry') ?? '5', 10);
    const retryAfter = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 3600) : 5;
    return {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
      body: '<html><body>Too Many Requests</body></html>',
    };
  },
};

/**
 * Mixed links page: /mixed-links — contains diverse link types for normalization testing.
 * @see REQ-K8E-037
 */
export const mixedLinksRoute: SimulatorRoute = {
  path: '/mixed-links',
  handler: (): SimulatorResponse => ({
    status: 200,
    body: [
      '<html><body>',
      '<h1>Mixed Links Page</h1>',
      '<a href="/page-a">Relative link</a>',
      '<a href="/page-a#section">Fragment link</a>',
      '<a href="/page-a?utm_source=test">Query param link</a>',
      '<a href="/Page-A">Case variant link</a>',
      '<a href="mailto:test@example.com">Mailto link</a>',
      '<a href="javascript:void(0)">JavaScript link</a>',
      '<a href="tel:+1234567890">Tel link</a>',
      '<a href="">Empty href</a>',
      '<a href="/page-b">Valid link B</a>',
      '</body></html>',
    ].join('\n'),
  }),
};

/** Collect all built-in scenario routes */
export function getBuiltInScenarioRoutes(): ReadonlyArray<SimulatorRoute> {
  return [
    slowResponseRoute,
    httpErrorRoute,
    redirectChainRoute,
    linkTrapRoute,
    ssrfBaitRoute,
    robotsTxtBlockRoute,
    rateLimitRoute,
    mixedLinksRoute,
  ];
}
