import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isDevelopmentModuleEnabled } from './development-module';

describe('isDevelopmentModuleEnabled', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('is disabled in production', () => {
    process.env.NODE_ENV = 'production';

    expect(isDevelopmentModuleEnabled()).toBe(false);
  });

  it('is enabled in development, test, and when unset', () => {
    process.env.NODE_ENV = 'development';
    expect(isDevelopmentModuleEnabled()).toBe(true);

    process.env.NODE_ENV = 'test';
    expect(isDevelopmentModuleEnabled()).toBe(true);

    delete process.env.NODE_ENV;
    expect(isDevelopmentModuleEnabled()).toBe(true);
  });
});
