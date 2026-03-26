// Request ID generation for HTTP correlation
// Implements: T-OBS-004, REQ-OBS-006

import { randomUUID } from 'node:crypto';

export function generateRequestId(): string {
  return randomUUID();
}
