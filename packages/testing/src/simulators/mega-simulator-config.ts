// Mega Simulator Configuration
// REQ-LTO-001..006: Parameterized domain generation with chaos injection
// Design: docs/specs/load-test-observability/design.md §2

import { createHash } from 'node:crypto';

export interface MegaSimulatorConfig {
  readonly domainCount: number;
  readonly pagesPerDomain: number;
  readonly crossDomainLinkRatio: number;
  readonly chaosDomainRatio: number;
  readonly disallowedPathRatio: number;
  readonly linksPerPage: number;
  readonly port: number;
}

export type ChaosScenarioType =
  | { readonly _tag: 'slow'; readonly minDelayMs: number; readonly maxDelayMs: number }
  | { readonly _tag: 'error'; readonly statusCodes: readonly number[] }
  | { readonly _tag: 'redirect-chain'; readonly hops: number }
  | { readonly _tag: 'intermittent'; readonly failureRate: number }
  | { readonly _tag: 'rate-limited'; readonly maxRequests: number };

export interface VirtualDomain {
  readonly id: number;
  readonly chaosScenario: ChaosScenarioType | undefined;
  readonly disallowedPages: readonly number[];
}

const DEFAULT_CONFIG: MegaSimulatorConfig = {
  domainCount: 1000,
  pagesPerDomain: 50,
  crossDomainLinkRatio: 0.1,
  chaosDomainRatio: 0.2,
  disallowedPathRatio: 0.1,
  linksPerPage: 10,
  port: 8080,
};

export function loadConfigFromEnv(): MegaSimulatorConfig {
  return {
    domainCount: parseInt(process.env['DOMAIN_COUNT'] ?? String(DEFAULT_CONFIG.domainCount), 10),
    pagesPerDomain: parseInt(process.env['PAGES_PER_DOMAIN'] ?? String(DEFAULT_CONFIG.pagesPerDomain), 10),
    crossDomainLinkRatio: parseFloat(process.env['CROSS_DOMAIN_LINK_RATIO'] ?? String(DEFAULT_CONFIG.crossDomainLinkRatio)),
    chaosDomainRatio: parseFloat(process.env['CHAOS_DOMAIN_RATIO'] ?? String(DEFAULT_CONFIG.chaosDomainRatio)),
    disallowedPathRatio: parseFloat(process.env['DISALLOWED_PATH_RATIO'] ?? String(DEFAULT_CONFIG.disallowedPathRatio)),
    linksPerPage: parseInt(process.env['LINKS_PER_PAGE'] ?? String(DEFAULT_CONFIG.linksPerPage), 10),
    port: parseInt(process.env['MEGA_SIMULATOR_PORT'] ?? String(DEFAULT_CONFIG.port), 10),
  };
}

/** Deterministic hash for seeded content generation (REQ-LTO-004) */
export function deterministicHash(domain: number, page: number, salt: string = ''): number {
  const hash = createHash('sha256')
    .update(`${String(domain)}:${String(page)}:${salt}`)
    .digest();
  return hash.readUInt32BE(0);
}

/** Content fingerprint for dedup verification (REQ-LTO-004) */
export function contentFingerprint(domain: number, page: number): string {
  return createHash('sha256')
    .update(`content:${String(domain)}:${String(page)}`)
    .digest('hex');
}

const CHAOS_TYPES: readonly ChaosScenarioType[] = [
  { _tag: 'slow', minDelayMs: 200, maxDelayMs: 5000 },
  { _tag: 'error', statusCodes: [500, 502, 503] },
  { _tag: 'redirect-chain', hops: 5 },
  { _tag: 'intermittent', failureRate: 0.3 },
  { _tag: 'rate-limited', maxRequests: 10 },
];

/** Generate all virtual domains with chaos assignment (REQ-LTO-003) */
export function generateDomains(config: MegaSimulatorConfig): readonly VirtualDomain[] {
  const domains: VirtualDomain[] = [];
  const chaosCount = Math.floor(config.domainCount * config.chaosDomainRatio);
  const disallowedCount = Math.max(1, Math.floor(config.pagesPerDomain * config.disallowedPathRatio));

  for (let i = 0; i < config.domainCount; i++) {
    const chaosScenario = i < chaosCount
      ? CHAOS_TYPES[i % CHAOS_TYPES.length]
      : undefined;

    const disallowedPages: number[] = [];
    for (let d = 0; d < disallowedCount; d++) {
      disallowedPages.push((deterministicHash(i, d, 'disallow') % config.pagesPerDomain));
    }

    domains.push({ id: i, chaosScenario, disallowedPages });
  }
  return domains;
}

/** Generate links for a page (REQ-LTO-001, REQ-LTO-002) */
export function generateLinks(
  config: MegaSimulatorConfig,
  domainId: number,
  pageNum: number,
): readonly string[] {
  const links: string[] = [];
  const crossDomainCount = Math.max(1, Math.floor(config.linksPerPage * config.crossDomainLinkRatio));
  const intraDomainCount = config.linksPerPage - crossDomainCount;

  for (let i = 0; i < intraDomainCount; i++) {
    const target = deterministicHash(domainId, pageNum, `link-${String(i)}`) % config.pagesPerDomain;
    links.push(`/domain-${String(domainId).padStart(4, '0')}/page-${String(target)}`);
  }

  for (let i = 0; i < crossDomainCount; i++) {
    const targetDomain = deterministicHash(domainId, pageNum, `cross-${String(i)}`) % config.domainCount;
    const targetPage = deterministicHash(targetDomain, pageNum, `cross-page-${String(i)}`) % config.pagesPerDomain;
    links.push(`/domain-${String(targetDomain).padStart(4, '0')}/page-${String(targetPage)}`);
  }

  return links;
}
