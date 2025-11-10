import { fetchService } from '../../src/services/fetch';
import { VersionNotFoundError } from '../../src/shared/errors/VersionErrors';
import { SearchIndexFactory } from '../../src/shared/SearchIndexFactory';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/services/fetch');
jest.mock('../../src/services/logger');

const mockFetchService = fetchService as jest.Mocked<typeof fetchService>;

describe('[SearchIndexFactory]', () => {
  let factory: SearchIndexFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: true });
  });

  describe('Version Error Handling', () => {
    it('should throw VersionNotFoundError when invalid version is requested with available versions', async () => {
      // Mock the version manager to return versioned site and invalid version
      const mockVersionManager = {
        detectVersioning: jest.fn().mockResolvedValue(true),
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
      // Mock the version manager to return versioned site and invalid version without available versions
      const mockVersionManager = {
        detectVersioning: jest.fn().mockResolvedValue(true),
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
      // Mock the version manager to return versioned site and invalid version with empty available versions
      const mockVersionManager = {
        detectVersioning: jest.fn().mockResolvedValue(true),
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

    it('should handle non-versioned sites correctly', async () => {
      // Create a factory for non-versioned site
      const nonVersionedFactory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: false });
      
      // Mock successful fetch response
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          config: { lang: ['en'], separator: ' ', pipeline: [] },
          docs: [
            { location: 'index/', title: 'Home', text: 'Welcome to the docs' }
          ]
        })
      } as any);

      // Should return search index for non-versioned site
      const result = await nonVersionedFactory.getSearchIndex('3.x');
      expect(result).toBeDefined();
      expect(result?.version).toBe('default');
    });
  });
});
