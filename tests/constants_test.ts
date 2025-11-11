import { SEARCH_CONFIDENCE_THRESHOLD } from '../src/constants';

import { describe, expect, it } from 'vitest';

describe('[Constants]', () => {
  describe('SEARCH_CONFIDENCE_THRESHOLD', () => {
    it('should be defined as a number', () => {
      expect(typeof SEARCH_CONFIDENCE_THRESHOLD).toBe('number');
    });

    it('should be a reasonable threshold value', () => {
      expect(SEARCH_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
      expect(SEARCH_CONFIDENCE_THRESHOLD).toBeLessThan(1);
    });

    it('should have the expected default value', () => {
      expect(SEARCH_CONFIDENCE_THRESHOLD).toBe(0.1);
    });
  });
});
