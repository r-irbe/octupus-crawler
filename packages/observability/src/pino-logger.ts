// Pino-based Logger adapter — structured JSON logging
// Implements: T-OBS-001, T-OBS-002, T-OBS-003, REQ-OBS-001..004

import pino from 'pino';
import type { Logger } from '@ipf/core/contracts/logger';

export interface PinoLoggerConfig {
  readonly level: string;
  readonly initialBindings?: Record<string, unknown>;
}

export function createPinoLogger(config: PinoLoggerConfig): Logger {
  const options: pino.LoggerOptions = {
    level: config.level,
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (config.initialBindings !== undefined) {
    options.base = config.initialBindings;
  }
  const pinoInstance = pino(options);

  return wrapPino(pinoInstance);
}

function wrapPino(instance: pino.Logger): Logger {
  return {
    debug(msg: string, bindings?: Record<string, unknown>): void {
      if (bindings !== undefined) {
        instance.debug(bindings, msg);
      } else {
        instance.debug(msg);
      }
    },
    info(msg: string, bindings?: Record<string, unknown>): void {
      if (bindings !== undefined) {
        instance.info(bindings, msg);
      } else {
        instance.info(msg);
      }
    },
    warn(msg: string, bindings?: Record<string, unknown>): void {
      if (bindings !== undefined) {
        instance.warn(bindings, msg);
      } else {
        instance.warn(msg);
      }
    },
    error(msg: string, bindings?: Record<string, unknown>): void {
      if (bindings !== undefined) {
        instance.error(bindings, msg);
      } else {
        instance.error(msg);
      }
    },
    fatal(msg: string, bindings?: Record<string, unknown>): void {
      if (bindings !== undefined) {
        instance.fatal(bindings, msg);
      } else {
        instance.fatal(msg);
      }
    },
    child(bindings: Record<string, unknown>): Logger {
      return wrapPino(instance.child(bindings));
    },
  };
}

// REQ-OBS-004: Per-job child logger factory
export interface JobLoggerBindings {
  readonly jobId: string;
  readonly url: string;
  readonly depth: number;
}

export function createJobLogger(
  parent: Logger,
  bindings: JobLoggerBindings,
): Logger {
  return parent.child({ ...bindings });
}
