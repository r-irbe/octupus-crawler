// Unit tests for token estimation
// Validates: T-VMEM-023 → REQ-VMEM-020

import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateTokensFromChars,
  getDeclaredWindow,
  getCharsPerToken,
} from './token-estimator.js';
import type { ModelFamily } from './token-estimator.js';

describe('token-estimator', () => {
  // T-VMEM-023: Token estimation accuracy within 15% of actual per model
  describe('estimateTokens', () => {
    it('estimates Claude tokens at ~3.5 chars/token', () => {
      const text = 'a'.repeat(350);
      const tokens = estimateTokens(text, 'claude');
      // 350 / 3.5 = 100
      expect(tokens).toBe(100);
    });

    it('estimates GPT-4 tokens at ~4 chars/token', () => {
      const text = 'a'.repeat(400);
      const tokens = estimateTokens(text, 'gpt4');
      // 400 / 4.0 = 100
      expect(tokens).toBe(100);
    });

    it('estimates Gemini tokens at ~4 chars/token', () => {
      const text = 'a'.repeat(800);
      const tokens = estimateTokens(text, 'gemini');
      // 800 / 4.0 = 200
      expect(tokens).toBe(200);
    });

    it('uses char/4 fallback for unknown model', () => {
      const text = 'a'.repeat(120);
      const tokens = estimateTokens(text, 'unknown');
      // 120 / 4.0 = 30
      expect(tokens).toBe(30);
    });

    it('rounds up to nearest integer', () => {
      // 10 / 3.5 = 2.857... → ceil = 3
      const tokens = estimateTokens('a'.repeat(10), 'claude');
      expect(tokens).toBe(3);
    });

    it('returns 0 for empty text', () => {
      expect(estimateTokens('', 'claude')).toBe(0);
    });

    it('handles multi-byte characters', () => {
      // Emoji characters: each emoji is multiple bytes but counts as chars
      const text = '🎉'.repeat(10);
      const tokens = estimateTokens(text, 'claude');
      // String.length counts UTF-16 code units, emoji is 2 code units
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('estimateTokensFromChars', () => {
    it('matches estimateTokens for same char count', () => {
      const charCount = 350;
      const model: ModelFamily = 'claude';
      expect(estimateTokensFromChars(charCount, model)).toBe(
        estimateTokens('a'.repeat(charCount), model),
      );
    });
  });

  // T-VMEM-024: Effective window calculation
  describe('getDeclaredWindow', () => {
    it('returns 200K for Claude', () => {
      expect(getDeclaredWindow('claude')).toBe(200_000);
    });

    it('returns 128K for GPT-4', () => {
      expect(getDeclaredWindow('gpt4')).toBe(128_000);
    });

    it('returns 1M for Gemini', () => {
      expect(getDeclaredWindow('gemini')).toBe(1_000_000);
    });

    it('returns 128K for unknown', () => {
      expect(getDeclaredWindow('unknown')).toBe(128_000);
    });
  });

  describe('getCharsPerToken', () => {
    it('returns model-specific ratios', () => {
      expect(getCharsPerToken('claude')).toBe(3.5);
      expect(getCharsPerToken('gpt4')).toBe(4.0);
      expect(getCharsPerToken('gemini')).toBe(4.0);
      expect(getCharsPerToken('unknown')).toBe(4.0);
    });
  });
});
