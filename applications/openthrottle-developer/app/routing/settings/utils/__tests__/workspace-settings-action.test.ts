import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  optionalTrimmedString,
  parseEnabledEditorsFromFormData,
  parseProjectIdFromFormData,
} from '../workspace-settings-action';

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
