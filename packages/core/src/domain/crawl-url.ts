// CrawlUrl — Branded value object for validated, normalized URLs
// Implements: T-ARCH-004, REQ-CRAWL-003 (cross-ref)

export type CrawlUrl = {
  readonly _brand: 'CrawlUrl';
  readonly raw: string;
  readonly normalized: string;
  readonly domain: string;
};

export function createCrawlUrl(p: {
  raw: string;
  normalized: string;
  domain: string;
}): CrawlUrl {
  return Object.freeze({
    _brand: 'CrawlUrl' as const,
    raw: p.raw,
    normalized: p.normalized,
    domain: p.domain,
  });
}
