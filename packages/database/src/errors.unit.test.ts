// DataError unit tests
// Validates: REQ-DATA-016 (Result<T, DataError> pattern, discriminated union)

import { describe, it, expect } from 'vitest';
import {
  createConnectionFailed,
  createQueryFailed,
  createNotFound,
  createDuplicateKey,
  createCircuitOpen,
  createTimeout,
  createS3Error,
  DataErrorTagSchema,
  type DataError,
} from './errors.js';

describe('DataError constructors', () => {
  // Validates REQ-DATA-016: ConnectionFailed variant
  it('creates ConnectionFailed error', () => {
    const err = createConnectionFailed(new Error('ECONNREFUSED'));
    expect(err._tag).toBe('ConnectionFailed');
    expect(err.message).toBe('Database connection failed');
    expect(err.cause).toBeInstanceOf(Error);
  });

  // Validates REQ-DATA-016: QueryFailed variant
  it('creates QueryFailed error', () => {
    const err = createQueryFailed('SELECT * FROM crawl_urls', new Error('syntax'));
    expect(err._tag).toBe('QueryFailed');
    expect(err.query).toBe('SELECT * FROM crawl_urls');
    expect(err.message).toContain('SELECT * FROM crawl_urls');
  });

  // Validates REQ-DATA-016: NotFound variant
  it('creates NotFound error', () => {
    const err = createNotFound('CrawlURL', '42');
    expect(err._tag).toBe('NotFound');
    expect(err.entity).toBe('CrawlURL');
    expect(err.id).toBe('42');
    expect(err.message).toContain('CrawlURL');
  });

  // Validates REQ-DATA-016: DuplicateKey variant
  it('creates DuplicateKey error', () => {
    const err = createDuplicateKey('crawl_urls_url_hash_key');
    expect(err._tag).toBe('DuplicateKey');
    expect(err.constraint).toBe('crawl_urls_url_hash_key');
  });

  // Validates REQ-DATA-016: CircuitOpen variant
  it('creates CircuitOpen error', () => {
    const err = createCircuitOpen('postgresql');
    expect(err._tag).toBe('CircuitOpen');
    expect(err.service).toBe('postgresql');
  });

  // Validates REQ-DATA-016: Timeout variant
  it('creates Timeout error', () => {
    const err = createTimeout('findById', 10000);
    expect(err._tag).toBe('Timeout');
    expect(err.operation).toBe('findById');
    expect(err.ms).toBe(10000);
    expect(err.message).toContain('10000');
  });

  // Validates REQ-DATA-016: S3Error variant
  it('creates S3Error', () => {
    const err = createS3Error('PutObject', new Error('access denied'));
    expect(err._tag).toBe('S3Error');
    expect(err.operation).toBe('PutObject');
  });
});

describe('DataErrorTagSchema', () => {
  // Validates REQ-DATA-016: all tags are valid
  it('accepts all valid error tags', () => {
    const tags = [
      'ConnectionFailed',
      'QueryFailed',
      'NotFound',
      'DuplicateKey',
      'CircuitOpen',
      'Timeout',
      'S3Error',
    ] as const;
    for (const tag of tags) {
      expect(DataErrorTagSchema.safeParse(tag).success).toBe(true);
    }
  });

  // Validates REQ-DATA-016: rejects invalid tags
  it('rejects invalid error tag', () => {
    expect(DataErrorTagSchema.safeParse('InvalidTag').success).toBe(false);
  });
});

describe('DataError discriminated union', () => {
  // Validates REQ-DATA-016: type narrowing works via _tag
  it('narrows type via _tag', () => {
    const errors: DataError[] = [
      createConnectionFailed(null),
      createQueryFailed('q', null),
      createNotFound('ent', '1'),
      createDuplicateKey('c'),
      createCircuitOpen('s'),
      createTimeout('op', 100),
      createS3Error('op', null),
    ];

    const tags = errors.map((e) => e._tag);
    expect(tags).toEqual([
      'ConnectionFailed',
      'QueryFailed',
      'NotFound',
      'DuplicateKey',
      'CircuitOpen',
      'Timeout',
      'S3Error',
    ]);
  });

  // Validates REQ-DATA-016: each error has a message
  it('all errors have non-empty messages', () => {
    const errors: DataError[] = [
      createConnectionFailed(null),
      createQueryFailed('q', null),
      createNotFound('ent', '1'),
      createDuplicateKey('c'),
      createCircuitOpen('s'),
      createTimeout('op', 100),
      createS3Error('op', null),
    ];

    for (const err of errors) {
      expect(err.message.length).toBeGreaterThan(0);
    }
  });
});
