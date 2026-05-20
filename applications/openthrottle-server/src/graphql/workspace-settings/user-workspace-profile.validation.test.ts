import { describe, expect, test } from 'vitest';
import { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';
import {
  validateContactDisplayName,
  validateContactEmail,
  validateEnabledEditors,
} from './user-workspace-profile.validation';

describe('validateContactDisplayName', () => {
  test('returns trimmed name when valid', () => {
    expect(validateContactDisplayName('  Matt  ')).toBe('Matt');
  });

  test('returns null when blank', () => {
    expect(validateContactDisplayName('   ')).toBeNull();
    expect(validateContactDisplayName(null)).toBeNull();
  });

  test('throws when name exceeds max length', () => {
    expect(() => validateContactDisplayName('a'.repeat(257))).toThrow(
      /contactDisplayName must be at most 256/,
    );
  });
});

describe('validateContactEmail', () => {
  test('returns trimmed email when valid', () => {
    expect(validateContactEmail('  dev@example.com  ')).toBe('dev@example.com');
  });

  test('returns null when blank', () => {
    expect(validateContactEmail('')).toBeNull();
    expect(validateContactEmail(null)).toBeNull();
  });

  test('throws for invalid email format', () => {
    expect(() => validateContactEmail('not-an-email')).toThrow(
      /valid email address/,
    );
  });

  test('throws when email exceeds max length', () => {
    const local = `${'a'.repeat(310)}@example.com`;
    expect(() => validateContactEmail(local)).toThrow(
      /contactEmail must be at most 320/,
    );
  });
});

describe('validateEnabledEditors', () => {
  test('returns undefined when omitted', () => {
    expect(validateEnabledEditors(undefined)).toBeUndefined();
    expect(validateEnabledEditors(null)).toBeUndefined();
  });

  test('deduplicates while preserving order', () => {
    expect(
      validateEnabledEditors([
        WorkspaceEditorIdEnum.VSCODE,
        WorkspaceEditorIdEnum.CURSOR,
        WorkspaceEditorIdEnum.VSCODE,
      ]),
    ).toEqual(['vscode', 'cursor']);
  });

  test('returns empty array when clearing editors', () => {
    expect(validateEnabledEditors([])).toEqual([]);
  });

  test('throws for unknown editor ids', () => {
    expect(() =>
      validateEnabledEditors(['unknown' as WorkspaceEditorIdEnum]),
    ).toThrow(/unknown editor id/);
  });
});
