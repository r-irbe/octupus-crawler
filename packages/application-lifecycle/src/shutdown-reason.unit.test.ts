// Validates REQ-LIFE-022: ShutdownReason discriminated union is correctly typed
// Validates T-LIFE-025

import { describe, it, expect } from 'vitest';
import {
  signalReason,
  completionReason,
  errorReason,
  abortReason,
  shutdownReasonLabel,
} from './shutdown-reason.js';
import { exitCodeForReason, EXIT_SUCCESS, EXIT_ERROR, EXIT_STATE_STORE_ABORT } from './exit-codes.js';

describe('ShutdownReason', () => {
  it('creates signal reason with correct tag', () => {
    const reason = signalReason('SIGTERM');
    expect(reason._tag).toBe('Signal');
    expect(reason).toStrictEqual({ _tag: 'Signal', signal: 'SIGTERM' });
  });

  it('creates completion reason', () => {
    const reason = completionReason();
    expect(reason._tag).toBe('Completion');
  });

  it('creates error reason with cause', () => {
    const cause = new Error('fail');
    const reason = errorReason(cause);
    expect(reason._tag).toBe('Error');
    expect(reason).toStrictEqual({ _tag: 'Error', cause });
  });

  it('creates abort reason with message', () => {
    const reason = abortReason('state-store exhausted');
    expect(reason._tag).toBe('Abort');
    expect(reason).toStrictEqual({ _tag: 'Abort', reason: 'state-store exhausted' });
  });

  it('produces human-readable labels', () => {
    expect(shutdownReasonLabel(signalReason('SIGINT'))).toBe('signal:SIGINT');
    expect(shutdownReasonLabel(completionReason())).toBe('completion');
    expect(shutdownReasonLabel(errorReason(new Error('x')))).toBe('error');
    expect(shutdownReasonLabel(abortReason('oom'))).toBe('abort:oom');
  });
});

describe('exitCodeForReason', () => {
  it('returns 0 for signal', () => {
    expect(exitCodeForReason('Signal')).toBe(EXIT_SUCCESS);
  });

  it('returns 0 for completion', () => {
    expect(exitCodeForReason('Completion')).toBe(EXIT_SUCCESS);
  });

  it('returns 1 for error', () => {
    expect(exitCodeForReason('Error')).toBe(EXIT_ERROR);
  });

  it('returns 3 for abort', () => {
    expect(exitCodeForReason('Abort')).toBe(EXIT_STATE_STORE_ABORT);
  });
});
