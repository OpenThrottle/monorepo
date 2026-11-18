import { describe, expect, it } from 'vitest';

import { isWorkspaceEditorId } from './workspace-editor-id.utils.ts';

describe('isWorkspaceEditorId', () => {
  describe('when the value is a known editor', () => {
    it('returns true', () => {
      expect(isWorkspaceEditorId('cursor')).toBe(true);
      expect(isWorkspaceEditorId('claude')).toBe(true);
      expect(isWorkspaceEditorId('vscode')).toBe(true);
    });
  });

  describe('when the value is unknown', () => {
    it('returns false', () => {
      expect(isWorkspaceEditorId('emacs')).toBe(false);
      expect(isWorkspaceEditorId('')).toBe(false);
    });
  });
});
