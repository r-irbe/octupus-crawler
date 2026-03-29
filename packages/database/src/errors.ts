// DataError — Discriminated union for data layer failures
// Implements: T-DATA-005 (REQ-DATA-016)
// NOTE: Uses _tag discriminant per AGENTS.md convention. packages/core/ uses 'kind' (legacy).
// New packages should use _tag.

import { z } from 'zod';

// --- Variant types ---

export type ConnectionFailedError = {
  readonly _tag: 'ConnectionFailed';
  readonly cause: unknown;
  readonly message: string;
};

export type QueryFailedError = {
  readonly _tag: 'QueryFailed';
  readonly query: string;
  readonly cause: unknown;
  readonly message: string;
};

export type NotFoundError = {
  readonly _tag: 'NotFound';
  readonly entity: string;
  readonly id: string;
  readonly message: string;
};

export type DuplicateKeyError = {
  readonly _tag: 'DuplicateKey';
  readonly constraint: string;
  readonly message: string;
};

export type CircuitOpenError = {
  readonly _tag: 'CircuitOpen';
  readonly service: string;
  readonly message: string;
};

export type TimeoutError = {
  readonly _tag: 'Timeout';
  readonly operation: string;
  readonly ms: number;
  readonly message: string;
};

export type S3Error = {
  readonly _tag: 'S3Error';
  readonly operation: string;
  readonly cause: unknown;
  readonly message: string;
};

// --- Union ---

export type DataError =
  | ConnectionFailedError
  | QueryFailedError
  | NotFoundError
  | DuplicateKeyError
  | CircuitOpenError
  | TimeoutError
  | S3Error;

export type DataErrorTag = DataError['_tag'];

// --- Zod schema for runtime validation ---

export const DataErrorTagSchema = z.enum([
  'ConnectionFailed',
  'QueryFailed',
  'NotFound',
  'DuplicateKey',
  'CircuitOpen',
  'Timeout',
  'S3Error',
]);

// --- Constructor functions ---

export function createConnectionFailed(cause: unknown): ConnectionFailedError {
  return { _tag: 'ConnectionFailed', cause, message: 'Database connection failed' };
}

export function createQueryFailed(query: string, cause: unknown): QueryFailedError {
  return { _tag: 'QueryFailed', query, cause, message: `Query failed: ${query}` };
}

export function createNotFound(entity: string, id: string): NotFoundError {
  return { _tag: 'NotFound', entity, id, message: `${entity} not found: ${id}` };
}

export function createDuplicateKey(constraint: string): DuplicateKeyError {
  return { _tag: 'DuplicateKey', constraint, message: `Duplicate key: ${constraint}` };
}

export function createCircuitOpen(service: string): CircuitOpenError {
  return { _tag: 'CircuitOpen', service, message: `Circuit open for ${service}` };
}

export function createTimeout(operation: string, ms: number): TimeoutError {
  return { _tag: 'Timeout', operation, ms, message: `Timeout after ${String(ms)}ms: ${operation}` };
}

export function createS3Error(operation: string, cause: unknown): S3Error {
  return { _tag: 'S3Error', operation, cause, message: `S3 error: ${operation}` };
}
