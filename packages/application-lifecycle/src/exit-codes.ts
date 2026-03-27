// Exit codes — typed constants for process exit
// Implements: REQ-LIFE-011 to 017

export const EXIT_SUCCESS = 0 as const;
export const EXIT_ERROR = 1 as const;
export const EXIT_STATE_STORE_ABORT = 3 as const;

export type ExitCode =
  | typeof EXIT_SUCCESS
  | typeof EXIT_ERROR
  | typeof EXIT_STATE_STORE_ABORT;

export function exitCodeForReason(tag: 'Signal' | 'Completion' | 'Error' | 'Abort'): ExitCode {
  switch (tag) {
    case 'Signal': return EXIT_SUCCESS;
    case 'Completion': return EXIT_SUCCESS;
    case 'Error': return EXIT_ERROR;
    case 'Abort': return EXIT_STATE_STORE_ABORT;
  }
}
