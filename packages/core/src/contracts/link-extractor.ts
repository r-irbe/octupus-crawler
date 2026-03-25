// LinkExtractor — HTML link extraction contract (synchronous, CPU-bound)
// Implements: T-ARCH-011, REQ-ARCH-002, REQ-ARCH-010

export interface LinkExtractor {
  extract(html: string, baseUrl: string): string[];
}
