import { describe, expect, test } from 'vitest';
import { createTestEnv, installTestEnv } from './env';

describe('createTestEnv', () => {
  test('returns the full env with realistic localhost defaults', () => {
    const env = createTestEnv();

    expect(env.API_URL_EXTERNAL).toBe('http://localhost:6021');
    expect(env.API_URL_INTERNAL).toBe('http://localhost:6021');
    expect(env.APP_URL_WEBSITE).toBe('http://localhost:6027');
    expect(env.APP_ENV).toBe('test');
    expect(env.NODE_ENV).toBe('test');
  });

  test('every key is present and non-empty (satisfies getEnvironment())', () => {
    const env = createTestEnv();

    expect(Object.keys(env)).toHaveLength(15);
    for (const value of Object.values(env)) {
      expect(value).toBeTruthy();
    }
  });

  test('merges overrides over the defaults without dropping other keys', () => {
    const env = createTestEnv({ APP_NAME: 'openthrottle-admin' });

    expect(env.APP_NAME).toBe('openthrottle-admin');
    expect(env.APP_NAME_SHORT).toBe('OT');
    expect(env.API_URL_EXTERNAL).toBe('http://localhost:6021');
  });
});

describe('installTestEnv', () => {
  test('populates window.env from the fixture', () => {
    installTestEnv();

    expect(window.env.APP_ENV).toBe('test');
    expect(window.env.API_URL_INTERNAL).toBe('http://localhost:6021');
  });

  test('applies overrides onto window.env', () => {
    installTestEnv({ APP_NAME: 'openthrottle-website' });

    expect(window.env.APP_NAME).toBe('openthrottle-website');
  });
});
