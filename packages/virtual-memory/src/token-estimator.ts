// Token estimation with model-specific ratios
// Implements: T-VMEM-002, REQ-VMEM-020

/** Supported model families for token estimation. */
export type ModelFamily = 'claude' | 'gpt4' | 'gemini' | 'unknown';

/** Chars-per-token ratio by model family (REQ-VMEM-020). */
const CHARS_PER_TOKEN: Record<ModelFamily, number> = {
  claude: 3.5,
  gpt4: 4.0,
  gemini: 4.0,
  unknown: 4.0,
};

/** Declared context window sizes by model family. */
const DECLARED_WINDOWS: Record<ModelFamily, number> = {
  claude: 200_000,
  gpt4: 128_000,
  gemini: 1_000_000,
  unknown: 128_000,
};

/**
 * Estimate token count from text length.
 * Uses model-specific chars/token ratio (REQ-VMEM-020).
 */
export function estimateTokens(text: string, model: ModelFamily): number {
  const ratio = CHARS_PER_TOKEN[model];
  return Math.ceil(text.length / ratio);
}

/**
 * Estimate token count from character count.
 * When actual text is not available.
 */
export function estimateTokensFromChars(charCount: number, model: ModelFamily): number {
  const ratio = CHARS_PER_TOKEN[model];
  return Math.ceil(charCount / ratio);
}

/** Get declared context window for a model family. */
export function getDeclaredWindow(model: ModelFamily): number {
  return DECLARED_WINDOWS[model];
}

/** Get chars-per-token ratio for a model family. */
export function getCharsPerToken(model: ModelFamily): number {
  return CHARS_PER_TOKEN[model];
}
