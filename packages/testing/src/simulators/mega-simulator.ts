// Mega Simulator HTTP Server
// REQ-LTO-001..006: Thousands of domains, tens of thousands of pages
// Design: docs/specs/load-test-observability/design.md §2

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import {
  type MegaSimulatorConfig,
  type VirtualDomain,
  generateDomains,
  generateLinks,
  contentFingerprint,
  deterministicHash,
} from './mega-simulator-config.js';

interface RequestCounts {
  [domainId: number]: number;
}

export interface MegaSimulatorHandle {
  readonly server: Server;
  close(): Promise<void>;
}

export function createMegaSimulator(config: MegaSimulatorConfig): MegaSimulatorHandle {
  const domains = generateDomains(config);
  const domainMap = new Map<number, VirtualDomain>();
  for (const d of domains) {
    domainMap.set(d.id, d);
  }

  // REQ-LTO-003: Track per-domain request counts for rate-limited scenario
  const requestCounts: RequestCounts = {};

  // REQ-LTO-006: Metrics counters
  let totalRequests = 0;
  let totalPages = 0;
  const statusCounts: Record<number, number> = {};

  const server = createServer((req: IncomingMessage, res: ServerResponse): void => {
    totalRequests++;
    const url = req.url ?? '/';

    // Metrics endpoint (REQ-LTO-006)
    if (url === '/metrics') {
      respondMetrics(res, config, totalRequests, totalPages, statusCounts);
      return;
    }

    // Health check
    if (url === '/health') {
      respond(res, 200, '{"status":"ok"}', 'application/json', statusCounts);
      return;
    }

    // Parse domain and page from URL: /domain-NNNN/page-N or /domain-NNNN/robots.txt
    const match = /^\/domain-(\d+)\/(page-(\d+)|robots\.txt)/.exec(url);
    if (match === null) {
      respond(res, 404, 'Not Found', 'text/plain', statusCounts);
      return;
    }

    const domainId = parseInt(match[1] ?? '0', 10);
    const domain = domainMap.get(domainId);
    if (domain === undefined) {
      respond(res, 404, 'Domain not found', 'text/plain', statusCounts);
      return;
    }

    // Robots.txt (REQ-LTO-005)
    if (match[2] === 'robots.txt') {
      const disallowLines = domain.disallowedPages
        .map((p) => `Disallow: /domain-${String(domainId).padStart(4, '0')}/page-${String(p)}`)
        .join('\n');
      respond(res, 200, `User-agent: *\n${disallowLines}\nAllow: /\n`, 'text/plain', statusCounts);
      return;
    }

    const pageNum = parseInt(match[3] ?? '0', 10);
    if (pageNum >= config.pagesPerDomain) {
      respond(res, 404, 'Page not found', 'text/plain', statusCounts);
      return;
    }

    // Apply chaos scenario (REQ-LTO-003)
    if (domain.chaosScenario !== undefined) {
      const handled = applyChaos(domain, domainId, res, statusCounts, requestCounts);
      if (handled) return;
    }

    // Generate page (REQ-LTO-001, REQ-LTO-004)
    totalPages++;
    const links = generateLinks(config, domainId, pageNum);
    const fp = contentFingerprint(domainId, pageNum);
    const linkHtml = links.map((l) => `<a href="${escapeHtml(l)}">${escapeHtml(l)}</a>`).join('\n    ');

    const html = `<!DOCTYPE html>
<html><head><title>Domain ${String(domainId)} Page ${String(pageNum)}</title></head>
<body>
  <h1>Domain ${String(domainId)} — Page ${String(pageNum)}</h1>
  <p>Fingerprint: ${fp}</p>
  <nav>
    ${linkHtml}
  </nav>
</body></html>`;

    respond(res, 200, html, 'text/html', statusCounts);
  });

  return {
    server,
    close: (): Promise<void> => new Promise((resolve, reject) => {
      server.close((err) => {
        if (err != null) { reject(err); } else { resolve(); }
      });
    }),
  };
}

function applyChaos(
  domain: VirtualDomain,
  domainId: number,
  res: ServerResponse,
  statusCounts: Record<number, number>,
  requestCounts: RequestCounts,
): boolean {
  const scenario = domain.chaosScenario;
  if (scenario === undefined) return false;

  switch (scenario._tag) {
    case 'slow': {
      const delay = scenario.minDelayMs + deterministicHash(domainId, Date.now(), 'delay') % (scenario.maxDelayMs - scenario.minDelayMs);
      setTimeout(() => { respond(res, 200, 'Slow response', 'text/plain', statusCounts); }, delay);
      return true;
    }
    case 'error': {
      const idx = deterministicHash(domainId, Date.now(), 'error') % scenario.statusCodes.length;
      const code = scenario.statusCodes[idx] ?? 500;
      respond(res, code, `Error: ${String(code)}`, 'text/plain', statusCounts);
      return true;
    }
    case 'redirect-chain': {
      const hop = parseInt(new URL(`http://localhost${res.req.url ?? '/'}`).searchParams.get('hop') ?? '0', 10);
      if (hop < scenario.hops) {
        const nextUrl = `${res.req.url?.split('?')[0] ?? '/'}?hop=${String(hop + 1)}`;
        res.writeHead(302, { Location: nextUrl });
        res.end();
        statusCounts[302] = (statusCounts[302] ?? 0) + 1;
        return true;
      }
      return false; // Final hop — serve page normally
    }
    case 'intermittent': {
      if (Math.random() < scenario.failureRate) {
        respond(res, 503, 'Service Unavailable', 'text/plain', statusCounts);
        return true;
      }
      return false;
    }
    case 'rate-limited': {
      const count = (requestCounts[domainId] ?? 0) + 1;
      requestCounts[domainId] = count;
      if (count > scenario.maxRequests) {
        res.writeHead(429, { 'Retry-After': '60' });
        res.end('Too Many Requests');
        statusCounts[429] = (statusCounts[429] ?? 0) + 1;
        return true;
      }
      return false;
    }
  }
}

function respond(
  res: ServerResponse,
  status: number,
  body: string,
  contentType: string,
  statusCounts: Record<number, number>,
): void {
  statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function respondMetrics(
  res: ServerResponse,
  config: MegaSimulatorConfig,
  totalRequests: number,
  totalPages: number,
  statusCounts: Record<number, number>,
): void {
  const lines: string[] = [
    '# HELP simulator_requests_total Total HTTP requests received',
    '# TYPE simulator_requests_total counter',
    `simulator_requests_total ${String(totalRequests)}`,
    '# HELP simulator_pages_served_total Total HTML pages served',
    '# TYPE simulator_pages_served_total counter',
    `simulator_pages_served_total ${String(totalPages)}`,
    '# HELP simulator_active_domains Number of configured virtual domains',
    '# TYPE simulator_active_domains gauge',
    `simulator_active_domains ${String(config.domainCount)}`,
  ];

  for (const [code, count] of Object.entries(statusCounts)) {
    lines.push(`simulator_requests_total{status="${code}"} ${String(count)}`);
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
  res.end(lines.join('\n') + '\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
