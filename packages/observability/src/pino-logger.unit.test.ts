// PinoLogger unit tests
// Validates: T-OBS-001 (5 levels + child), T-OBS-002 (JSON + ISO 8601),
//            T-OBS-003 (per-job child), REQ-OBS-001..004
// G8-F-001: Test helper uses production wrapPino — not a reimplementation

import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { Writable } from 'node:stream';
import { wrapPino, createPinoLogger, createJobLogger } from './pino-logger.js';
import type { Logger } from '@ipf/core/contracts/logger';

interface LogRecord {
  level: number;
  msg: string;
  time: string;
  [key: string]: unknown;
}

function createCapturingLogger(
  level: string = 'debug',
  initialBindings?: Record<string, unknown>,
): { logger: Logger; getRecords: () => LogRecord[] } {
  const records: LogRecord[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void): void {
      records.push(JSON.parse(chunk.toString()) as LogRecord);
      callback();
    },
  });

  const pinoOptions: pino.LoggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (initialBindings !== undefined) {
    pinoOptions.base = initialBindings;
  }
  const pinoInstance = pino(pinoOptions, stream);
  const logger = wrapPino(pinoInstance);

  return { logger, getRecords: (): LogRecord[] => records };
}

// Validates T-OBS-001: 5 severity levels
describe('PinoLogger severity levels (REQ-OBS-001)', () => {
  it('should log at debug level', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.debug('debug message');
    const records = getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.msg).toBe('debug message');
    expect(records[0]?.level).toBe(20); // pino debug = 20
  });

  it('should log at info level', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.info('info message');
    const records = getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.msg).toBe('info message');
    expect(records[0]?.level).toBe(30); // pino info = 30
  });

  it('should log at warn level', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.warn('warn message');
    expect(getRecords()[0]?.level).toBe(40);
  });

  it('should log at error level', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.error('error message');
    expect(getRecords()[0]?.level).toBe(50);
  });

  it('should log at fatal level', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.fatal('fatal message');
    expect(getRecords()[0]?.level).toBe(60);
  });
});

// Validates T-OBS-002: JSON output with ISO 8601 timestamps
describe('PinoLogger JSON output (REQ-OBS-003)', () => {
  it('should output JSON records with ISO 8601 timestamps', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.info('structured');
    const record = getRecords()[0];
    expect(record).toBeDefined();
    // ISO 8601 format: 2026-03-26T... 
    expect(record?.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should include initial bindings in every record', () => {
    const { logger, getRecords } = createCapturingLogger('debug', {
      service: 'worker',
      workerId: 'w1',
    });
    logger.info('test');
    const record = getRecords()[0];
    expect(record?.['service']).toBe('worker');
    expect(record?.['workerId']).toBe('w1');
  });

  it('should include inline bindings in the record', () => {
    const { logger, getRecords } = createCapturingLogger();
    logger.info('fetched', { url: 'https://example.com', statusCode: 200 });
    const record = getRecords()[0];
    expect(record?.['url']).toBe('https://example.com');
    expect(record?.['statusCode']).toBe(200);
  });
});

// Validates T-OBS-001, REQ-OBS-002: child logger with merged bindings
describe('PinoLogger child (REQ-OBS-002)', () => {
  it('should create a child logger with merged bindings', () => {
    const { logger, getRecords } = createCapturingLogger('debug', {
      service: 'worker',
    });
    const child = logger.child({ jobId: 'j1' });
    child.info('processing');
    const record = getRecords()[0];
    expect(record?.['service']).toBe('worker');
    expect(record?.['jobId']).toBe('j1');
  });

  it('should support chained child() to arbitrary depth', () => {
    const { logger, getRecords } = createCapturingLogger('debug', {
      service: 'worker',
    });
    const grandchild = logger
      .child({ jobId: 'j1' })
      .child({ url: 'https://example.com' })
      .child({ depth: 3 });
    grandchild.info('deep log');
    const record = getRecords()[0];
    expect(record?.['service']).toBe('worker');
    expect(record?.['jobId']).toBe('j1');
    expect(record?.['url']).toBe('https://example.com');
    expect(record?.['depth']).toBe(3);
  });
});

// Validates T-OBS-003: per-job child logger factory
describe('createJobLogger (REQ-OBS-004)', () => {
  it('should create a child logger with jobId, url, and depth', () => {
    const { logger, getRecords } = createCapturingLogger('debug', {
      service: 'worker',
    });
    const jobLogger = createJobLogger(logger, {
      jobId: 'job-123',
      url: 'https://example.com/page',
      depth: 2,
    });
    jobLogger.info('fetched');
    const record = getRecords()[0];
    expect(record?.['jobId']).toBe('job-123');
    expect(record?.['url']).toBe('https://example.com/page');
    expect(record?.['depth']).toBe(2);
    expect(record?.['service']).toBe('worker');
  });
});

// Validates: createPinoLogger factory function
describe('createPinoLogger factory', () => {
  it('should create a logger without throwing', () => {
    expect(() => {
      createPinoLogger({ level: 'info' });
    }).not.toThrow();
  });

  it('should respect log level filtering', () => {
    // createPinoLogger writes to stdout — just verify it doesn't throw
    const logger = createPinoLogger({ level: 'error' });
    logger.debug('should be filtered');
    logger.info('should be filtered');
    logger.error('should appear');
  });
});
