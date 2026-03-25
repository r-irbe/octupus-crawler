import type { Result } from 'neverthrow';

/** Async operation returning a typed Result — the standard async error channel. */
export type AsyncResult<T, E> = Promise<Result<T, E>>;
