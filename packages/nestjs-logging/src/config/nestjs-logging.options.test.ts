import { describe, expect, it } from 'vitest';
import { NestjsLoggingError } from './nestjs-logging.error';
import {
  applyNestjsLoggingModuleDefaults,
  validateNestjsLoggingModuleOptions,
} from './nestjs-logging.options';

describe('validateNestjsLoggingModuleOptions', () => {
  it('throws when options are missing', () => {
    expect(() => validateNestjsLoggingModuleOptions(undefined)).toThrow(
      NestjsLoggingError,
    );
  });

  it('throws when logDirectory is empty', () => {
    expect(() =>
      validateNestjsLoggingModuleOptions({ logDirectory: '   ' }),
    ).toThrow(NestjsLoggingError);
  });

  it('accepts minimal valid options', () => {
    const opts = { logDirectory: '/var/log/app' };

    expect(() => validateNestjsLoggingModuleOptions(opts)).not.toThrow();
  });

  describe('rotation type size', () => {
    it('throws when maxBytes is invalid', () => {
      expect(() =>
        validateNestjsLoggingModuleOptions({
          logDirectory: '/tmp',
          rotation: { keepFiles: 3, maxBytes: 0, type: 'size' },
        }),
      ).toThrow(NestjsLoggingError);
    });

    it('accepts valid size rotation', () => {
      expect(() =>
        validateNestjsLoggingModuleOptions({
          logDirectory: '/tmp',
          rotation: { keepFiles: 3, maxBytes: 1024, type: 'size' },
        }),
      ).not.toThrow();
    });
  });
});

describe('applyNestjsLoggingModuleDefaults', () => {
  it('fills fileBasename and rotation when omitted', () => {
    const merged = applyNestjsLoggingModuleDefaults({
      logDirectory: '/tmp',
    });

    expect(merged.fileBasename).toBe('application');
    expect(merged.rotation).toEqual({ type: 'none' });
    expect(merged.flushIntervalMs).toBe(1_000);
  });
});
