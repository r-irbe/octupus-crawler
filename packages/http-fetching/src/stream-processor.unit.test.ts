// Validates T-FETCH-022: Body size limits (Content-Length + streaming)
// REQ-FETCH-014, REQ-FETCH-015, REQ-FETCH-016, REQ-FETCH-017

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { checkContentLength, readBodyStream, drainBody } from './stream-processor.js';

// --- Helpers ---

function bodyFrom(text: string): Readable {
  return Readable.from([Buffer.from(text, 'utf-8')]);
}

function bodyFromChunks(chunks: string[]): Readable {
  return Readable.from(chunks.map((c) => Buffer.from(c, 'utf-8')));
}

function errorStream(msg: string): Readable {
  return new Readable({
    read(): void {
      this.destroy(new Error(msg));
    },
  });
}

// --- checkContentLength ---

describe('checkContentLength', () => {
  it('returns not exceeded when content-length is missing', () => {
    const result = checkContentLength({}, 1024);
    expect(result.exceeded).toBe(false);
    expect(result.contentLength).toBeUndefined();
  });

  it('returns not exceeded when content-length is within limit', () => {
    const result = checkContentLength({ 'content-length': '512' }, 1024);
    expect(result.exceeded).toBe(false);
    expect(result.contentLength).toBe(512);
  });

  it('returns exceeded when content-length exceeds limit', () => {
    const result = checkContentLength({ 'content-length': '2048' }, 1024);
    expect(result.exceeded).toBe(true);
    expect(result.contentLength).toBe(2048);
  });

  it('handles array-valued content-length header', () => {
    const result = checkContentLength({ 'content-length': ['512'] }, 1024);
    expect(result.exceeded).toBe(false);
    expect(result.contentLength).toBe(512);
  });

  it('handles non-numeric content-length gracefully', () => {
    const result = checkContentLength({ 'content-length': 'abc' }, 1024);
    expect(result.exceeded).toBe(false);
    expect(result.contentLength).toBeUndefined();
  });
});

// --- readBodyStream ---

describe('readBodyStream', () => {
  it('reads body and returns text with byte count', async () => {
    const result = await readBodyStream(bodyFrom('hello world'), 1024);
    expect('body' in result).toBe(true);
    if ('body' in result) {
      expect(result.body).toBe('hello world');
      expect(result.byteCount).toBe(11);
    }
  });

  it('concatenates multiple chunks', async () => {
    const result = await readBodyStream(bodyFromChunks(['he', 'llo']), 1024);
    if ('body' in result) {
      expect(result.body).toBe('hello');
      expect(result.byteCount).toBe(5);
    }
  });

  it('returns body_too_large when stream exceeds limit', async () => {
    const result = await readBodyStream(bodyFrom('toolong'), 3);
    expect('kind' in result).toBe(true);
    if ('kind' in result) {
      expect(result.kind).toBe('body_too_large');
    }
  });

  it('returns stream_error on stream failure', async () => {
    const result = await readBodyStream(errorStream('broken'), 1024);
    expect('kind' in result).toBe(true);
    if ('kind' in result) {
      expect(result.kind).toBe('stream_error');
    }
  });
});

// --- drainBody ---

describe('drainBody', () => {
  it('consumes all chunks without returning data', async () => {
    const stream = bodyFrom('drain me');
    await drainBody(stream);
    // No assertion needed — just verifying it completes without error
  });

  it('does not throw on stream error', async () => {
    const stream = errorStream('drain fail');
    // Should not throw — errors are swallowed per REQ-FETCH-024
    await expect(drainBody(stream)).resolves.toBeUndefined();
  });
});
