// ShutdownReason — typed discriminated union for shutdown triggers
// Implements: T-LIFE-025, REQ-LIFE-022

export type ShutdownReason =
  | { readonly _tag: 'Signal'; readonly signal: string }
  | { readonly _tag: 'Completion' }
  | { readonly _tag: 'Error'; readonly cause: unknown }
  | { readonly _tag: 'Abort'; readonly reason: string };

export function signalReason(signal: string): ShutdownReason {
  return { _tag: 'Signal', signal };
}

export function completionReason(): ShutdownReason {
  return { _tag: 'Completion' };
}

export function errorReason(cause: unknown): ShutdownReason {
  return { _tag: 'Error', cause };
}

export function abortReason(reason: string): ShutdownReason {
  return { _tag: 'Abort', reason };
}

export function shutdownReasonLabel(reason: ShutdownReason): string {
  switch (reason._tag) {
    case 'Signal': return `signal:${reason.signal}`;
    case 'Completion': return 'completion';
    case 'Error': return 'error';
    case 'Abort': return `abort:${reason.reason}`;
  }
}
