import { describe, expect, test, vi } from 'vitest';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import { getSettingsDiagnosticsLoaderData } from '../settings-diagnostics-loader-data';

const MOCK_ENV: OpenThrottleEnv = {
  API_URL_EXTERNAL: 'http://localhost:6021',
  API_URL_INTERNAL: 'http://localhost:6021',
  APP_ENV: 'test',
  APP_NAME: 'openthrottle-developer',
  APP_NAME_SHORT: 'ot-dev',
  APP_URL: 'http://localhost:6020',
  APP_URL_ADMIN: 'http://localhost:6010',
  APP_URL_CMS: 'http://localhost:6030',
  APP_URL_DEVELOPER: 'http://localhost:6020',
  APP_URL_EMAIL: 'http://localhost:6040',
  APP_URL_SERVER: 'http://localhost:6021',
  APP_URL_WEBSITE: 'http://localhost:6050',
  APP_VERSION: '0.0.0',
  NODE_ENV: 'test',
  ROLLBAR_TOKEN: 'super-secret-token-value',
};

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();
  return {
    ...actual,
    getEnvironment: () => MOCK_ENV,
  };
});

describe('getSettingsDiagnosticsLoaderData', () => {
  test('returns the raw environment alongside a sanitized support bundle', () => {
    const data = getSettingsDiagnosticsLoaderData();

    expect(data.env).toEqual(MOCK_ENV);
    expect(data.supportBundle['APP_NAME']).toBe('openthrottle-developer');
    expect(data.supportBundle['ROLLBAR_TOKEN']).toBe('supe…alue (masked)');
  });

  test('includes a generatedAt ISO timestamp key in the support bundle', () => {
    const data = getSettingsDiagnosticsLoaderData();

    expect(data.supportBundle['generatedAt']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});
