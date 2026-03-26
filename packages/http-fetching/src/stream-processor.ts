// Stream Processor — body streaming with byte counting and size limits
// Implements: T-FETCH-012 to 015, REQ-FETCH-014 to 017

import type { Readable } from 'node:stream';

// --- Types ---

export type StreamResult = {
  readonly body: string;
  readonly byteCount: number;
};

export type StreamError =
  | { readonly kind: 'body_too_large'; readonly byteCount: number }
  | { readonly kind: 'stream_error'; readonly cause: Error };

// --- Content-Length pre-flight check (REQ-FETCH-015) ---

export function checkContentLength(
  headers: Record<string, string | string[] | undefined>,
  maxBytes: number,
): { exceeded: boolean; contentLength: number | undefined } {
  const raw = headers['content-length'];
  if (raw === undefined) {
    return { exceeded: false, contentLength: undefined };
  }

  const value = typeof raw === 'string' ? raw : raw[0];
  if (value === undefined) {
    return { exceeded: false, contentLength: undefined };
  }

  const contentLength = Number(value);
  if (Number.isNaN(contentLength)) {
    return { exceeded: false, contentLength: undefined };
  }

  return { exceeded: contentLength > maxBytes, contentLength };
}

// --- Streaming body reader with byte counting (REQ-FETCH-014) ---

export async function readBodyStream(
  body: Readable,
  maxBytes: number,
): Promise<StreamResult | StreamError> {
  const chunks: Buffer[] = [];
  let byteCount = 0;

  try {
    for await (const chunk of body) {
      const buf: Buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as string | Uint8Array);
      byteCount += buf.length;

      if (byteCount > maxBytes) {
        // REQ-FETCH-014: Destroy stream and return body_too_large
        body.destroy();
        return { kind: 'body_too_large', byteCount };
      }

      chunks.push(buf);
    }
  } catch (err: unknown) {
    return {
      kind: 'stream_error',
      cause: err instanceof Error ? err : new Error(String(err)),
    };
  }

  // REQ-FETCH-016: UTF-8 decode
  const bodyText = Buffer.concat(chunks).toString('utf-8');
  return { body: bodyText, byteCount };
}

// --- Drain response body to free connections (REQ-FETCH-017) ---

export async function drainBody(body: Readable): Promise<void> {
  try {
    // Consume and discard all chunks
    for await (const _chunk of body) {
      // discard
    }
  } catch {
    // REQ-FETCH-024: Catch + log drain errors, do not propagate
    // Caller handles logging
  }
}
