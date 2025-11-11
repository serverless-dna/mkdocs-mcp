import { IndexLoadError, VersionDetectionError, VersionNotFoundError } from '../../../src/shared/errors/VersionErrors';
import type { VersionInfo } from '../../../src/shared/types/version';

import { describe, expect, it } from '@jest/globals';

describe('VersionErrors', () => {
  describe('VersionNotFoundError', () => {
    const mockVersions: VersionInfo[] = [
      { version: 'latest', title: 'Latest', aliases: ['main'] },
      { version: '1.0.0', title: 'Version 1.0', aliases: ['stable'] },
      { version: '0.9.0', title: 'Version 0.9', aliases: [] }
    ];

    it('should create error with requested version and available versions', () => {
      const error = new VersionNotFoundError('2.0.0', mockVersions);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(VersionNotFoundError);
      expect(error.requestedVersion).toBe('2.0.0');
      expect(error.availableVersions).toEqual(mockVersions);
    });

    it('should format error message correctly', () => {
      const error = new VersionNotFoundError('2.0.0', mockVersions);

      expect(error.message).toBe(
        "Version '2.0.0' not found. Available versions: latest, 1.0.0, 0.9.0"
      );
    });

    it('should have correct error name', () => {
      const error = new VersionNotFoundError('2.0.0', mockVersions);

      expect(error.name).toBe('VersionNotFoundError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new VersionNotFoundError('2.0.0', mockVersions);
      }).toThrow(VersionNotFoundError);

      try {
        throw new VersionNotFoundError('2.0.0', mockVersions);
      } catch (error) {
        expect(error).toBeInstanceOf(VersionNotFoundError);
        if (error instanceof VersionNotFoundError) {
          expect(error.requestedVersion).toBe('2.0.0');
          expect(error.availableVersions).toHaveLength(3);
        }
      }
    });

    it('should handle empty available versions array', () => {
      const error = new VersionNotFoundError('1.0.0', []);

      expect(error.message).toBe("Version '1.0.0' not found. Available versions: ");
      expect(error.availableVersions).toEqual([]);
    });

    it('should handle single available version', () => {
      const singleVersion: VersionInfo[] = [
        { version: 'latest', title: 'Latest', aliases: [] }
      ];
      const error = new VersionNotFoundError('1.0.0', singleVersion);

      expect(error.message).toBe("Version '1.0.0' not found. Available versions: latest");
    });

    it('should preserve version info properties', () => {
      const error = new VersionNotFoundError('2.0.0', mockVersions);

      expect(error.availableVersions[0].version).toBe('latest');
      expect(error.availableVersions[0].title).toBe('Latest');
      expect(error.availableVersions[0].aliases).toEqual(['main']);
    });
  });

  describe('VersionDetectionError', () => {
    const baseUrl = 'https://docs.example.com';
    const causeError = new Error('Network timeout');

    it('should create error with baseUrl and cause', () => {
      const error = new VersionDetectionError(baseUrl, causeError);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(VersionDetectionError);
      expect(error.baseUrl).toBe(baseUrl);
      expect(error.cause).toBe(causeError);
    });

    it('should format error message correctly', () => {
      const error = new VersionDetectionError(baseUrl, causeError);

      expect(error.message).toBe(
        'Failed to detect versioning for https://docs.example.com: Network timeout'
      );
    });

    it('should have correct error name', () => {
      const error = new VersionDetectionError(baseUrl, causeError);

      expect(error.name).toBe('VersionDetectionError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new VersionDetectionError(baseUrl, causeError);
      }).toThrow(VersionDetectionError);

      try {
        throw new VersionDetectionError(baseUrl, causeError);
      } catch (error) {
        expect(error).toBeInstanceOf(VersionDetectionError);
        if (error instanceof VersionDetectionError) {
          expect(error.baseUrl).toBe(baseUrl);
          expect(error.cause).toBe(causeError);
        }
      }
    });

    it('should handle different cause error types', () => {
      const typeError = new TypeError('Invalid type');
      const error = new VersionDetectionError(baseUrl, typeError);

      expect(error.cause).toBe(typeError);
      expect(error.message).toContain('Invalid type');
    });

    it('should preserve cause error stack trace', () => {
      const causeWithStack = new Error('Original error');
      const error = new VersionDetectionError(baseUrl, causeWithStack);

      expect(error.cause.stack).toBeDefined();
    });
  });

  describe('IndexLoadError', () => {
    const baseUrl = 'https://docs.example.com';
    const causeError = new Error('Failed to fetch');

    it('should create error with baseUrl, version, and cause', () => {
      const error = new IndexLoadError(baseUrl, 'latest', causeError);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(IndexLoadError);
      expect(error.baseUrl).toBe(baseUrl);
      expect(error.version).toBe('latest');
      expect(error.cause).toBe(causeError);
    });

    it('should format error message with version', () => {
      const error = new IndexLoadError(baseUrl, 'latest', causeError);

      expect(error.message).toBe(
        'Failed to load search index for https://docs.example.com (version: latest): Failed to fetch'
      );
    });

    it('should format error message without version', () => {
      const error = new IndexLoadError(baseUrl, undefined, causeError);

      expect(error.message).toBe(
        'Failed to load search index for https://docs.example.com: Failed to fetch'
      );
    });

    it('should have correct error name', () => {
      const error = new IndexLoadError(baseUrl, 'latest', causeError);

      expect(error.name).toBe('IndexLoadError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new IndexLoadError(baseUrl, 'latest', causeError);
      }).toThrow(IndexLoadError);

      try {
        throw new IndexLoadError(baseUrl, 'latest', causeError);
      } catch (error) {
        expect(error).toBeInstanceOf(IndexLoadError);
        if (error instanceof IndexLoadError) {
          expect(error.baseUrl).toBe(baseUrl);
          expect(error.version).toBe('latest');
          expect(error.cause).toBe(causeError);
        }
      }
    });

    it('should handle different version strings', () => {
      const error1 = new IndexLoadError(baseUrl, '1.0.0', causeError);
      const error2 = new IndexLoadError(baseUrl, 'v2.0.0', causeError);

      expect(error1.message).toContain('version: 1.0.0');
      expect(error2.message).toContain('version: v2.0.0');
    });

    it('should handle undefined version gracefully', () => {
      const error = new IndexLoadError(baseUrl, undefined, causeError);

      expect(error.version).toBeUndefined();
      expect(error.message).not.toContain('version:');
    });

    it('should preserve all error properties', () => {
      const error = new IndexLoadError(baseUrl, 'latest', causeError);

      expect(error.baseUrl).toBe(baseUrl);
      expect(error.version).toBe('latest');
      expect(error.cause).toBe(causeError);
      expect(error.name).toBe('IndexLoadError');
      expect(error.message).toBeDefined();
      expect(error.stack).toBeDefined();
    });
  });

  describe('Error inheritance and type checking', () => {
    it('should all inherit from Error', () => {
      const versionNotFound = new VersionNotFoundError('1.0.0', []);
      const versionDetection = new VersionDetectionError('https://example.com', new Error());
      const indexLoad = new IndexLoadError('https://example.com', 'latest', new Error());

      expect(versionNotFound).toBeInstanceOf(Error);
      expect(versionDetection).toBeInstanceOf(Error);
      expect(indexLoad).toBeInstanceOf(Error);
    });

    it('should be distinguishable by instanceof', () => {
      const versionNotFound = new VersionNotFoundError('1.0.0', []);
      const versionDetection = new VersionDetectionError('https://example.com', new Error());
      const indexLoad = new IndexLoadError('https://example.com', 'latest', new Error());

      expect(versionNotFound).toBeInstanceOf(VersionNotFoundError);
      expect(versionNotFound).not.toBeInstanceOf(VersionDetectionError);
      expect(versionNotFound).not.toBeInstanceOf(IndexLoadError);

      expect(versionDetection).toBeInstanceOf(VersionDetectionError);
      expect(versionDetection).not.toBeInstanceOf(VersionNotFoundError);
      expect(versionDetection).not.toBeInstanceOf(IndexLoadError);

      expect(indexLoad).toBeInstanceOf(IndexLoadError);
      expect(indexLoad).not.toBeInstanceOf(VersionNotFoundError);
      expect(indexLoad).not.toBeInstanceOf(VersionDetectionError);
    });

    it('should have unique error names', () => {
      const versionNotFound = new VersionNotFoundError('1.0.0', []);
      const versionDetection = new VersionDetectionError('https://example.com', new Error());
      const indexLoad = new IndexLoadError('https://example.com', 'latest', new Error());

      expect(versionNotFound.name).toBe('VersionNotFoundError');
      expect(versionDetection.name).toBe('VersionDetectionError');
      expect(indexLoad.name).toBe('IndexLoadError');
    });
  });
});
