import { logger } from '../../../src/services/logger';
import { buildResponse } from '../../../src/tools/shared/buildResponse';

import { beforeEach,describe, expect, it } from 'vitest';

// Mock logger
vi.mock('../../../src/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

const mockLogger = logger as vi.Mocked<typeof logger>;

describe('[BuildResponse Utility]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('When building successful responses', () => {
    it('should handle string content', () => {
      const result = buildResponse({
        content: 'Simple text response'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Simple text response'
          }
        ]
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Tool response', {
        content: 'Simple text response'
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should stringify object content', () => {
      const objectContent = {
        query: 'test',
        results: [{ title: 'Test Page' }],
        total: 1
      };

      const result = buildResponse({
        content: objectContent
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(objectContent, null, 2)
          }
        ]
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Tool response', {
        content: objectContent
      });
    });

    it('should handle array content', () => {
      const arrayContent = ['item1', 'item2'];

      const result = buildResponse({
        content: arrayContent
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(arrayContent, null, 2)
          }
        ]
      });
    });

    it('should handle null and undefined content', () => {
      const nullResult = buildResponse({ content: null });
      expect(nullResult.content[0].text).toBe('null');

      const undefinedResult = buildResponse({ content: undefined });
      expect(undefinedResult.content[0].text).toBe(undefined);
    });
  });

  describe('When building error responses', () => {
    it('should include isError flag and log error', () => {
      const result = buildResponse({
        content: 'Something went wrong',
        isError: true
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Something went wrong'
          }
        ],
        isError: true
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Tool response indicates an error', {
        content: 'Something went wrong'
      });
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should stringify error object content', () => {
      const errorContent = {
        error: 'Network timeout',
        code: 500
      };

      const result = buildResponse({
        content: errorContent,
        isError: true
      });

      expect(result.content[0].text).toBe(JSON.stringify(errorContent, null, 2));
      expect(result.isError).toBe(true);
    });
  });

  describe('When isError is false explicitly', () => {
    it('should not include isError property', () => {
      const result = buildResponse({
        content: 'Success',
        isError: false
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Success'
          }
        ]
      });

      expect('isError' in result).toBe(false);
    });
  });
});
