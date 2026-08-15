import { describe, expect, test } from 'vitest';
import {
  formatRolloutTargetRoles,
  parseRolloutTargetRoles,
  rolloutFlagDetailPath,
} from '../rollout-action';

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
