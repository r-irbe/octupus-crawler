// Validates REQ-ARCH-011: Typed error channel — Result<T, E> wrapper for domain errors
import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import type { AsyncResult } from '../types/result.js';

describe('AsyncResult', () => {
  // Validates REQ-ARCH-011: domain errors returned as typed Result values
  it('resolves to an ok Result', async () => {
    const result: AsyncResult<number, string> = Promise.resolve(ok(42));
    const resolved = await result;
    expect(resolved.isOk()).toBe(true);
    expect(resolved._unsafeUnwrap()).toBe(42);
  });

  it('resolves to an err Result', async () => {
    const result: AsyncResult<number, string> = Promise.resolve(err('fail'));
    const resolved = await result;
    expect(resolved.isErr()).toBe(true);
    expect(resolved._unsafeUnwrapErr()).toBe('fail');
  });

  it('is compatible with async functions returning Result', async () => {
    async function fetchData(): AsyncResult<string, Error> {
      return await Promise.resolve(ok('data'));
    }
    const result = await fetchData();
    expect(result.isOk()).toBe(true);
  });
});
