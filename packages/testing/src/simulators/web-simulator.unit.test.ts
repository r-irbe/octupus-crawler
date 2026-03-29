// Unit tests for Web Simulator
// Validates: T-K8E-004, REQ-K8E-010–015

import { describe, it, expect, afterEach } from 'vitest';
import { createWebSimulator, type WebSimulatorInstance } from './web-simulator.js';
import { createSiteGraphSimulator, generatePageHtml } from './site-graph-builder.js';
import {
  slowResponseRoute,
  httpErrorRoute,
  redirectChainRoute,
  linkTrapRoute,
  ssrfBaitRoute,
  robotsTxtBlockRoute,
  rateLimitRoute,
  mixedLinksRoute,
} from './built-in-scenarios.js';

let simulator: WebSimulatorInstance | undefined;

afterEach(async () => {
  if (simulator !== undefined) {
    await simulator.close();
    simulator = undefined;
  }
});

describe('createWebSimulator', () => {
  // Validates REQ-K8E-015: binds to random port and reports address
  it('starts on a random port and returns url', async () => {
    simulator = await createWebSimulator({ port: 0 }, [
      { path: '/', handler: () => ({ status: 200, body: 'OK' }) },
    ]);

    expect(simulator.port).toBeGreaterThan(0);
    expect(simulator.url).toContain(String(simulator.port));
  });

  // Validates REQ-K8E-010: handles registered routes
  it('serves registered routes with correct status', async () => {
    simulator = await createWebSimulator({ port: 0 }, [
      { path: '/hello', handler: () => ({ status: 200, body: 'Hello!' }) },
    ]);

    const res = await fetch(`${simulator.url}/hello`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('Hello!');
  });

  // Validates REQ-K8E-010: 404 for unregistered routes
  it('returns 404 for unknown paths', async () => {
    simulator = await createWebSimulator({ port: 0 }, []);

    const res = await fetch(`${simulator.url}/missing`);
    expect(res.status).toBe(404);
  });

  // Validates REQ-K8E-012: dynamic handler with async response
  it('supports async handlers', async () => {
    simulator = await createWebSimulator({ port: 0 }, [
      {
        path: '/async',
        handler: async () => {
          await new Promise<void>((r) => { setTimeout(r, 10); });
          return { status: 201, body: 'Created' };
        },
      },
    ]);

    const res = await fetch(`${simulator.url}/async`);
    expect(res.status).toBe(201);
  });
});

describe('createSiteGraphSimulator', () => {
  // Validates REQ-K8E-011: site graph with links
  it('serves pages with navigable links', async () => {
    simulator = await createSiteGraphSimulator({ port: 0 }, {
      pages: [
        { path: '/', title: 'Home', links: ['/about', '/blog'] },
        { path: '/about', title: 'About', links: ['/'] },
        { path: '/blog', title: 'Blog', links: ['/'] },
      ],
    });

    const res = await fetch(`${simulator.url}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Home');
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/blog"');

    const aboutRes = await fetch(`${simulator.url}/about`);
    expect(aboutRes.status).toBe(200);
    const aboutHtml = await aboutRes.text();
    expect(aboutHtml).toContain('About');
  });

  // Validates REQ-K8E-014: robots.txt support
  it('serves robots.txt when configured', async () => {
    simulator = await createSiteGraphSimulator({ port: 0 }, {
      pages: [{ path: '/', title: 'Home', links: [] }],
      robotsTxt: 'User-agent: *\nDisallow: /private',
    });

    const res = await fetch(`${simulator.url}/robots.txt`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('User-agent: *\nDisallow: /private');
  });
});

describe('generatePageHtml', () => {
  it('produces valid HTML with title and links', () => {
    const html = generatePageHtml({
      path: '/test',
      title: 'Test Page',
      links: ['/a', '/b'],
    });

    expect(html).toContain('<title>Test Page</title>');
    expect(html).toContain('href="/a"');
    expect(html).toContain('href="/b"');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('escapes HTML in title and links', () => {
    const html = generatePageHtml({
      path: '/xss',
      title: '<script>alert(1)</script>',
      links: ['/<script>'],
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('built-in scenarios', () => {
  // Validates REQ-K8E-013: slow response
  it('slow response delays by specified ms', async () => {
    simulator = await createWebSimulator({ port: 0 }, [slowResponseRoute]);

    const start = Date.now();
    const res = await fetch(`${simulator.url}/slow?ms=100`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(80); // account for timing variance
  });

  // Validates REQ-K8E-013: HTTP error codes
  it('error route returns specified status code', async () => {
    simulator = await createWebSimulator({ port: 0 }, [httpErrorRoute]);

    const res404 = await fetch(`${simulator.url}/error?code=404`);
    expect(res404.status).toBe(404);

    const res503 = await fetch(`${simulator.url}/error?code=503`);
    expect(res503.status).toBe(503);
  });

  // Validates REQ-K8E-013: redirect chain
  it('redirect chain hops the specified number of times', async () => {
    simulator = await createWebSimulator({ port: 0 }, [redirectChainRoute]);

    // Follow 1 redirect manually
    const res = await fetch(`${simulator.url}/redirect?hops=1`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/redirect?hops=0');

    // Final hop returns 200
    const finalRes = await fetch(`${simulator.url}/redirect?hops=0`);
    expect(finalRes.status).toBe(200);
  });

  // Validates REQ-K8E-013: link trap
  it('link trap generates infinite-depth pages', async () => {
    simulator = await createWebSimulator({ port: 0 }, [linkTrapRoute]);

    const res = await fetch(`${simulator.url}/trap?depth=5`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('depth 5');
    expect(html).toContain('href="/trap?depth=6"');
  });

  // Validates REQ-K8E-019: SSRF bait links
  it('ssrf-links page contains reserved IP links', async () => {
    simulator = await createWebSimulator({ port: 0 }, [ssrfBaitRoute]);

    const res = await fetch(`${simulator.url}/ssrf-links`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('169.254.169.254');
    expect(html).toContain('127.0.0.1');
    expect(html).toContain('10.0.0.1');
  });

  // Validates REQ-K8E-038: robots.txt block route
  it('robots-block route serves correct Disallow directives', async () => {
    simulator = await createWebSimulator({ port: 0 }, [robotsTxtBlockRoute]);

    const res = await fetch(`${simulator.url}/robots-block`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain');
    const text = await res.text();
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /private');
    expect(text).toContain('Crawl-delay: 1');
    expect(text).toContain('User-agent: ipf-crawler');
    expect(text).toContain('Allow: /admin/public');
  });

  // Validates REQ-K8E-034: rate limit route
  it('rate-limit route returns 429 with Retry-After header', async () => {
    simulator = await createWebSimulator({ port: 0 }, [rateLimitRoute]);

    const res = await fetch(`${simulator.url}/rate-limit`);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('5');
  });

  // Validates REQ-K8E-034: rate limit with custom retry value
  it('rate-limit route accepts custom retry parameter', async () => {
    simulator = await createWebSimulator({ port: 0 }, [rateLimitRoute]);

    const res = await fetch(`${simulator.url}/rate-limit?retry=10`);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('10');
  });

  // Validates REQ-K8E-037: mixed links page
  it('mixed-links page contains diverse link types', async () => {
    simulator = await createWebSimulator({ port: 0 }, [mixedLinksRoute]);

    const res = await fetch(`${simulator.url}/mixed-links`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('href="/page-a"');
    expect(html).toContain('href="/page-a#section"');
    expect(html).toContain('href="/page-a?utm_source=test"');
    expect(html).toContain('href="/Page-A"');
    expect(html).toContain('href="mailto:test@example.com"');
    expect(html).toContain('href="javascript:void(0)"');
    expect(html).toContain('href="/page-b"');
  });
});
