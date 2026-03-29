// PageContentRepository — Domain port for S3 page content storage
// Implements: T-DATA-020 (REQ-DATA-014)
// NOTE: Port lives here temporarily. Consider extracting to packages/core/src/ports/.

import type { Result } from 'neverthrow';
import type { DataError } from '../errors.js';
import type { FetchMetadata, PageKey } from '../types.js';

/**
 * Repository port for page content storage (S3/MinIO).
 * REQ-DATA-014: Defines store, retrieve, delete operations.
 * REQ-DATA-016: All operations return Result<T, DataError>.
 */
export type PageContentRepository = {
  /** Store page content (compressed) with metadata. */
  readonly store: (
    key: PageKey,
    content: Uint8Array,
    metadata: FetchMetadata,
  ) => Promise<Result<void, DataError>>;

  /** Retrieve page content by key. */
  readonly retrieve: (key: PageKey) => Promise<Result<Uint8Array, DataError>>;

  /** Delete page content by key. */
  readonly delete: (key: PageKey) => Promise<Result<void, DataError>>;
};
