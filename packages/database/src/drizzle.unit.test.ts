// Drizzle database instance factory — Unit tests
// Validates: T-DATA-018 (REQ-DATA-009, REQ-DATA-015) — Drizzle ORM with connection pooling

import { describe, it, expect } from 'vitest';
import { createDrizzle } from './connection/drizzle.js';
import type pg from 'pg';

describe('createDrizzle', () => {
  // Validates REQ-DATA-009: Drizzle instance created from pg.Pool
  it('returns a DrizzleDB instance from a pg.Pool', () => {
    const mockPool = {} as pg.Pool;
    const db = createDrizzle(mockPool);

    expect(db).toBeDefined();
    expect(db.select).toBeTypeOf('function');
    expect(db.insert).toBeTypeOf('function');
    expect(db.update).toBeTypeOf('function');
    expect(db.delete).toBeTypeOf('function');
  });
});
