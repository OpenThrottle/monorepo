import { describe, expect, test } from 'vitest';
import { CLIENT_LOG_LEVELS } from '~/routing/settings/client-log-sink';
import { isClientLogLevel } from './is-client-log-level';

describe('isClientLogLevel', () => {
  test.each(CLIENT_LOG_LEVELS)('accepts known client log level %s', (level) => {
    expect(isClientLogLevel(level)).toBe(true);
  });

  test('rejects an unknown level', () => {
    expect(isClientLogLevel('trace')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isClientLogLevel('')).toBe(false);
  });
});
