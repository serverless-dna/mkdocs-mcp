
import { logger } from './logger';

import { describe, expect, it, jest } from '@jest/globals';

// Mock AWS Powertools Logger
jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  LogFormatter: jest.fn().mockImplementation(() => ({
    formatAttributes: jest.fn(),
  })),
  LogItem: jest.fn().mockImplementation((attrs) => ({
    addAttributes: jest.fn().mockReturnThis(),
    ...attrs,
  })),
}));

describe('[Logger] When using the simplified logger', () => {
  it('should export a logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
