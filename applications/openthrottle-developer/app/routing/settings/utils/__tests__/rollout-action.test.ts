import { describe, expect, test } from 'vitest';
import {
  formatRolloutTargetRoles,
  optionalRolloutString,
  parseRolloutEnabled,
  parseRolloutTargetRoles,
  rolloutFlagDetailPath,
} from '../rollout-action';

describe('optionalRolloutString', () => {
  test('returns null for a non-string value', () => {
    expect(optionalRolloutString(null)).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(optionalRolloutString('')).toBeNull();
  });

  test('returns null for a whitespace-only string', () => {
    expect(optionalRolloutString('   ')).toBeNull();
  });

  test('returns the trimmed string', () => {
    expect(optionalRolloutString('  hello  ')).toBe('hello');
  });
});

describe('parseRolloutEnabled', () => {
  test('returns true for "true"', () => {
    expect(parseRolloutEnabled('true')).toBe(true);
  });

  test('returns true for "on"', () => {
    expect(parseRolloutEnabled('on')).toBe(true);
  });

  test('returns false for "false"', () => {
    expect(parseRolloutEnabled('false')).toBe(false);
  });

  test('returns false for null', () => {
    expect(parseRolloutEnabled(null)).toBe(false);
  });

  test('returns false for a non-string value', () => {
    const file = new File(['content'], 'file.txt');
    expect(parseRolloutEnabled(file)).toBe(false);
  });
});

describe('parseRolloutTargetRoles', () => {
  test('returns an empty list for a non-string value', () => {
    expect(parseRolloutTargetRoles(null)).toEqual([]);
  });

  test('splits, trims, and drops empty fragments', () => {
    expect(parseRolloutTargetRoles('admin, editor ,  ,viewer')).toEqual([
      'admin',
      'editor',
      'viewer',
    ]);
  });

  test('de-dupes role names', () => {
    expect(parseRolloutTargetRoles('admin, admin, editor')).toEqual([
      'admin',
      'editor',
    ]);
  });

  test('returns an empty list for an empty string', () => {
    expect(parseRolloutTargetRoles('')).toEqual([]);
  });
});

describe('formatRolloutTargetRoles', () => {
  test('joins roles with a comma and space', () => {
    expect(formatRolloutTargetRoles(['admin', 'editor'])).toBe('admin, editor');
  });

  test('returns an empty string for an empty list', () => {
    expect(formatRolloutTargetRoles([])).toBe('');
  });
});

describe('rolloutFlagDetailPath', () => {
  test('builds the flag detail path', () => {
    expect(rolloutFlagDetailPath('flag-123')).toBe(
      '/settings/rollout/flag-123',
    );
  });
});
