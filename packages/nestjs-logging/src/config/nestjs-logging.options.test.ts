import { describe, expect, it } from 'vitest';
import { NestjsLoggingError } from './nestjs-logging.error';
import {
  applyNestjsLoggingModuleDefaults,
  validateNestjsLoggingModuleAsyncOptions,
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

  describe('redaction', () => {
    it('accepts false (disabled)', () => {
      expect(() =>
        validateNestjsLoggingModuleOptions({
          logDirectory: '/tmp',
          redaction: false,
        }),
      ).not.toThrow();
    });

    it('accepts a custom policy', () => {
      expect(() =>
        validateNestjsLoggingModuleOptions({
          logDirectory: '/tmp',
          redaction: {
            keys: ['custom'],
            patterns: [/x/g],
            redactMessage: false,
            replacement: '***',
          },
        }),
      ).not.toThrow();
    });

    it('throws when keys is not an array of strings', () => {
      expect(() =>
        validateNestjsLoggingModuleOptions({
          logDirectory: '/tmp',
          redaction: { keys: [1] },
        }),
      ).toThrow(NestjsLoggingError);
    });

    it('throws when patterns contains a non-RegExp', () => {
      expect(() =>
        validateNestjsLoggingModuleOptions({
          logDirectory: '/tmp',
          redaction: { patterns: ['not-a-regex'] },
        }),
      ).toThrow(NestjsLoggingError);
    });
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
    expect(merged.websocket.enabled).toBe(false);
    expect(merged.websocket.namespace).toBe('/ot-logging');
  });

  it('resolves a default-on redactor when redaction is omitted', () => {
    const merged = applyNestjsLoggingModuleDefaults({ logDirectory: '/tmp' });

    expect(merged.redactor.redactMessageEnabled).toBe(true);
    expect(merged.redactor.redactValue({ token: 't' })).toEqual({
      token: '[REDACTED]',
    });
  });

  it('resolves a disabled redactor when redaction is false', () => {
    const merged = applyNestjsLoggingModuleDefaults({
      logDirectory: '/tmp',
      redaction: false,
    });

    expect(merged.redactor.redactValue({ token: 't' })).toEqual({
      token: 't',
    });
  });

  it('preserves websocket.enabled when set to true', () => {
    const merged = applyNestjsLoggingModuleDefaults({
      logDirectory: '/tmp',
      websocket: { enabled: true, namespace: '/custom' },
    });

    expect(merged.websocket.enabled).toBe(true);
    expect(merged.websocket.namespace).toBe('/custom');
  });
});

describe('validateNestjsLoggingModuleAsyncOptions', () => {
  it('throws when websocketGatewayNamespace is invalid', () => {
    expect(() =>
      validateNestjsLoggingModuleAsyncOptions({
        useFactory: async () => ({ logDirectory: '/tmp' }),
        websocketGatewayNamespace: 'no-leading-slash',
      }),
    ).toThrow(NestjsLoggingError);
  });

  it('accepts valid registerWebsocketGateway options', () => {
    expect(() =>
      validateNestjsLoggingModuleAsyncOptions({
        registerWebsocketGateway: true,
        useFactory: async () => ({ logDirectory: '/tmp' }),
        websocketGatewayNamespace: '/custom',
      }),
    ).not.toThrow();
  });
});
