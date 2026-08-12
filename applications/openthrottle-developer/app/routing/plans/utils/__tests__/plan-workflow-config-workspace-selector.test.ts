import { describe, expect, test } from 'vitest';
import {
  basename,
  CHECKOUT_PREFIX,
  CUSTOM_VALUE,
  REPOSITORY_PREFIX,
  ROOT_VALUE,
} from '../plan-workflow-config-workspace-selector';

describe('plan-workflow-config-workspace-selector constants', () => {
  test('exposes the expected select-value encodings', () => {
    expect(ROOT_VALUE).toBe('root');
    expect(CUSTOM_VALUE).toBe('custom');
    expect(CHECKOUT_PREFIX).toBe('checkout:');
    expect(REPOSITORY_PREFIX).toBe('repo:');
  });
});

describe('basename', () => {
  test('returns the last path segment', () => {
    expect(basename('/Users/dev/openthrottle')).toBe('openthrottle');
  });

  test('strips trailing slashes before taking the last segment', () => {
    expect(basename('/Users/dev/openthrottle/')).toBe('openthrottle');
    expect(basename('/Users/dev/openthrottle///')).toBe('openthrottle');
  });

  test('returns the whole path when there is no separator', () => {
    expect(basename('openthrottle')).toBe('openthrottle');
  });

  test('returns an empty string when the path is only slashes', () => {
    expect(basename('/')).toBe('');
    expect(basename('///')).toBe('');
  });

  test('returns an empty string for an empty input', () => {
    expect(basename('')).toBe('');
  });
});
