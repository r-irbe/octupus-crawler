// Unit tests for exit-codes module
// Validates: T-TCH-008, REQ-TCH-009

import { describe, it, expect } from 'vitest';
import {
  EXIT_SUCCESS,
  EXIT_ERROR,
  EXIT_STATE_STORE_ABORT,
  exitCodeForReason,
} from './exit-codes.js';

describe('exit code constants', () => {
  // Validates REQ-TCH-009: constant values
  it('EXIT_SUCCESS is 0', () => {
    expect(EXIT_SUCCESS).toBe(0);
  });

  it('EXIT_ERROR is 1', () => {
    expect(EXIT_ERROR).toBe(1);
  });

  it('EXIT_STATE_STORE_ABORT is 3', () => {
    expect(EXIT_STATE_STORE_ABORT).toBe(3);
  });
});

describe('exitCodeForReason', () => {
  // Validates REQ-TCH-009: Signal → EXIT_SUCCESS
  it('returns EXIT_SUCCESS for Signal', () => {
    expect(exitCodeForReason('Signal')).toBe(EXIT_SUCCESS);
  });

  // Validates REQ-TCH-009: Completion → EXIT_SUCCESS
  it('returns EXIT_SUCCESS for Completion', () => {
    expect(exitCodeForReason('Completion')).toBe(EXIT_SUCCESS);
  });

  // Validates REQ-TCH-009: Error → EXIT_ERROR
  it('returns EXIT_ERROR for Error', () => {
    expect(exitCodeForReason('Error')).toBe(EXIT_ERROR);
  });

  // Validates REQ-TCH-009: Abort → EXIT_STATE_STORE_ABORT
  it('returns EXIT_STATE_STORE_ABORT for Abort', () => {
    expect(exitCodeForReason('Abort')).toBe(EXIT_STATE_STORE_ABORT);
  });
});
