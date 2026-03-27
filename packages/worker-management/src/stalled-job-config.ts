// StalledJobConfig — configuration for stalled job detection
// Implements: T-WORK-006, REQ-DIST-008

export type StalledJobConfig = {
  readonly checkInterval: number;
  readonly lockDuration: number;
  readonly maxStalledCount: number;
};

const DEFAULT_CHECK_INTERVAL = 30_000;
const DEFAULT_MAX_STALLED_COUNT = 3;

/** Create validated stalled job config. lockDuration must be >= 2 * checkInterval. */
export function createStalledJobConfig(
  partial?: Partial<StalledJobConfig>,
): StalledJobConfig {
  const checkInterval = partial?.checkInterval ?? DEFAULT_CHECK_INTERVAL;
  const lockDuration = partial?.lockDuration ?? checkInterval * 2;
  const maxStalledCount = partial?.maxStalledCount ?? DEFAULT_MAX_STALLED_COUNT;

  if (checkInterval <= 0) {
    throw new Error(`checkInterval must be positive, got ${String(checkInterval)}`);
  }
  if (lockDuration < 2 * checkInterval) {
    throw new Error(
      `lockDuration (${String(lockDuration)}) must be >= 2 * checkInterval (${String(2 * checkInterval)})`,
    );
  }
  if (maxStalledCount < 1) {
    throw new Error(`maxStalledCount must be >= 1, got ${String(maxStalledCount)}`);
  }

  return { checkInterval, lockDuration, maxStalledCount };
}
