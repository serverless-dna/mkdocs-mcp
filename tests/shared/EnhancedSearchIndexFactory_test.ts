import { EnhancedSearchIndexFactory } from '../../src/shared/EnhancedSearchIndexFactory';
import { VersionNotFoundError } from '../../src/shared/errors/VersionErrors';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/services/fetch', () => ({
  fetchService: {
    fetch: jest.fn()
  }
}));

jest.mock('../../src/services/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('[EnhancedSearchIndexFactory]', () => {
  let factory: EnhancedSearchIndexFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new EnhancedSearchIndexFactory('https://docs.example.com');
  });

  describe('Version Error Handling', () => {
    it('should throw VersionNotFoundError when invalid version is requested with available versions', async () => {
      // Mock the version manager to return invalid version with available versions
      const mockVersionManager = {
        resolveVersion: jest.fn().mockResolvedValue({
          valid: false,
          resolved: '3.x',
          available: [
            { version: 'v1.0', title: 'Version 1.0', aliases: ['1.0'] },
            { version: 'v2.0', title: 'Version 2.0', aliases: ['2.0', 'latest'] }
          ],
          error: 'Version not found'
        })
      };

      // Replace the version manager
      (factory as any).versionManager = mockVersionManager;

      // Expect the method to throw VersionNotFoundError
      await expect(factory.getSearchIndex('3.x')).rejects.toThrow(VersionNotFoundError);
      
      // Verify the error contains the correct information
      try {
        await factory.getSearchIndex('3.x');
      } catch (error) {
        expect(error).toBeInstanceOf(VersionNotFoundError);
        if (error instanceof VersionNotFoundError) {
          expect(error.requestedVersion).toBe('3.x');
          expect(error.availableVersions).toHaveLength(2);
          expect(error.availableVersions[0].version).toBe('v1.0');
          expect(error.availableVersions[1].version).toBe('v2.0');
        }
      }
    });

    it('should return undefined when invalid version is requested without available versions', async () => {
      // Mock the version manager to return invalid version without available versions
      const mockVersionManager = {
        resolveVersion: jest.fn().mockResolvedValue({
          valid: false,
          resolved: '3.x',
          available: undefined,
          error: 'Version detection failed'
        })
      };

      // Replace the version manager
      (factory as any).versionManager = mockVersionManager;

      // Should return undefined instead of throwing
      const result = await factory.getSearchIndex('3.x');
      expect(result).toBeUndefined();
    });

    it('should return undefined when invalid version is requested with empty available versions', async () => {
      // Mock the version manager to return invalid version with empty available versions
      const mockVersionManager = {
        resolveVersion: jest.fn().mockResolvedValue({
          valid: false,
          resolved: '3.x',
          available: [],
          error: 'Version not found'
        })
      };

      // Replace the version manager
      (factory as any).versionManager = mockVersionManager;

      // Should return undefined instead of throwing
      const result = await factory.getSearchIndex('3.x');
      expect(result).toBeUndefined();
    });
  });
});
