// Resilient CrawlURLRepository — wraps repository with database circuit breaker
// Implements: T-RES-019 (REQ-RES-001)
// REQ-RES-001: All external service calls (database queries) use circuit breakers

import type { DatabaseCircuitBreaker } from '../connection/circuit-breaker.js';
import type { CrawlURLRepository } from './crawl-url-repository.js';

/**
 * Wraps a CrawlURLRepository with a database circuit breaker.
 * All repository operations execute through the CB's execute method.
 */
export function createResilientCrawlURLRepository(
  repo: CrawlURLRepository,
  cb: DatabaseCircuitBreaker,
): CrawlURLRepository {
  return {
    findById: (id) => cb.execute(() => repo.findById(id)),
    findByHash: (hash) => cb.execute(() => repo.findByHash(hash)),
    save: (url) => cb.execute(() => repo.save(url)),
    saveBatch: (urls) => cb.execute(() => repo.saveBatch(urls)),
    findPendingByDomain: (domain, limit) => cb.execute(() => repo.findPendingByDomain(domain, limit)),
    updateStatus: (id, status, result) => cb.execute(() => repo.updateStatus(id, status, result)),
  };
}
