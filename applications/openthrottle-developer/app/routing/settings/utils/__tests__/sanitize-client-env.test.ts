import { describe, expect, test } from 'vitest';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import {
  maskSensitiveEnvValue,
  sanitizeEnvForDiagnostics,
} from '../sanitize-client-env';

const baseEnv: OpenThrottleEnv = {
  API_URL_EXTERNAL: 'http://localhost:6021',
  API_URL_INTERNAL: 'http://localhost:6021',
  APP_ENV: 'development',
  APP_NAME: 'openthrottle-developer',
  APP_NAME_SHORT: 'developer',
  APP_URL: 'http://localhost:6020',
  APP_URL_ADMIN: 'http://localhost:6022',
  APP_URL_CMS: 'http://localhost:6023',
  APP_URL_DEVELOPER: 'http://localhost:6020',
  APP_URL_EMAIL: 'http://localhost:6024',
  APP_URL_SERVER: 'http://localhost:6021',
  APP_URL_WEBSITE: 'http://localhost:6025',
  APP_VERSION: 'localhost',
  NODE_ENV: 'development',
  ROLLBAR_TOKEN: 'abcdefghijklmnopqrstuvwxyz123456',
};

describe('sanitize-client-env', () => {
  describe('maskSensitiveEnvValue', () => {
    test('masks ROLLBAR_TOKEN with partial reveal', () => {
      expect(
        maskSensitiveEnvValue('ROLLBAR_TOKEN', 'abcdefghijklmnopqrst'),
      ).toBe('abcd…qrst (masked)');
    });

    test('masks short token-like keys fully', () => {
      expect(maskSensitiveEnvValue('API_SECRET', 'short')).toBe(
        '•••••••• (redacted)',
      );
    });

    test('leaves non-sensitive keys unchanged', () => {
      expect(maskSensitiveEnvValue('APP_URL', 'http://localhost:6020')).toBe(
        'http://localhost:6020',
      );
    });
  });

  describe('sanitizeEnvForDiagnostics', () => {
    test('sorts keys and masks Rollbar', () => {
      const out = sanitizeEnvForDiagnostics(baseEnv);
      const keys = Object.keys(out);
      expect(keys).toStrictEqual([...keys].sort((a, b) => a.localeCompare(b)));
      expect(out.ROLLBAR_TOKEN).toContain('masked');
      expect(out.APP_URL).toBe('http://localhost:6020');
    });
  });
});
