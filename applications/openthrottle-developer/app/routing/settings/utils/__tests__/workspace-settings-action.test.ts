import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  optionalTrimmedString,
  parseEnabledEditorsFromFormData,
  parseProjectIdFromFormData,
} from '../workspace-settings-action';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';

describe('workspace-settings-action', () => {
  describe('parseEnabledEditorsFromFormData', () => {
    test('deduplicates valid editor values', () => {
      const formData = new FormData();
      formData.append('enabledEditors', WorkspaceEditorId.Cursor);
      formData.append('enabledEditors', WorkspaceEditorId.Vscode);
      formData.append('enabledEditors', WorkspaceEditorId.Cursor);

      expect(parseEnabledEditorsFromFormData(formData)).toEqual([
        WorkspaceEditorId.Cursor,
        WorkspaceEditorId.Vscode,
      ]);
    });

    test('accepts every editor the picker offers', () => {
      // Derived from WORKSPACE_EDITOR_OPTIONS on purpose: this parser once kept
      // its own hardcoded allowlist, so a newly supported editor stayed
      // selectable in the UI but was silently dropped on save.
      const formData = new FormData();
      for (const option of WORKSPACE_EDITOR_OPTIONS) {
        formData.append('enabledEditors', option.value);
      }

      expect(parseEnabledEditorsFromFormData(formData)).toEqual(
        WORKSPACE_EDITOR_OPTIONS.map((option) => option.value),
      );
    });

    test('ignores unknown values', () => {
      const formData = new FormData();
      formData.append('enabledEditors', 'unknown');

      expect(parseEnabledEditorsFromFormData(formData)).toEqual([]);
    });
  });

  describe('optionalTrimmedString', () => {
    test('returns null for blank strings', () => {
      expect(optionalTrimmedString('   ')).toBeNull();
    });

    test('returns trimmed value', () => {
      expect(optionalTrimmedString('  hello  ')).toBe('hello');
    });
  });

  describe('parseProjectIdFromFormData', () => {
    test('maps sentinel to null', () => {
      expect(parseProjectIdFromFormData('__none__')).toBeNull();
    });

    test('returns project id when set', () => {
      expect(parseProjectIdFromFormData('proj-1')).toBe('proj-1');
    });
  });
});
