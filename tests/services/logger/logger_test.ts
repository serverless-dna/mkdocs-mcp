
import { logger } from '../../../src/services/logger/logger';

import { afterEach,beforeEach, describe, expect, it, jest } from 'vitest';

describe('[Logger] Simple stderr logger', () => {
  let stderrSpy: jest.SpiedFunction<typeof process.stderr.write>;
  
  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('should export a logger instance with all methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should write info messages to stderr', () => {
    logger.info('test message');
    
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] mkdocs-mcp: test message')
    );
  });

  it('should write error messages to stderr', () => {
    logger.error('error message');
    
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] mkdocs-mcp: error message')
    );
  });

  it('should include metadata in log messages', () => {
    logger.info('test with meta', { key: 'value' });
    
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('{"key":"value"}')
    );
  });

  it('should respect log level filtering', () => {
    // Assuming default INFO level, debug should not log
    logger.debug('debug message');
    
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('should format messages with timestamp and service name', () => {
    logger.warn('warning message');
    
    const call = stderrSpy.mock.calls[0][0] as string;
    expect(call).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[WARN\] mkdocs-mcp: warning message/);
  });
});
