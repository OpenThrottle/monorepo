import { describe, expect, it } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import { getCheckoutEditorLink } from '~/routing/plans/utils/getCheckoutEditorLink';

const FILESYSTEM_PATH = '/work/repo';

describe('getCheckoutEditorLink', () => {
  describe('when there is no checkout', () => {
    it('returns null', () => {
      expect(getCheckoutEditorLink(null, null)).toBeNull();
      expect(
        getCheckoutEditorLink(undefined, WorkspaceEditorId.Cursor),
      ).toBeNull();
    });
  });

  describe('when no default editor is set', () => {
    it('keeps the VS Code folder link', () => {
      expect(
        getCheckoutEditorLink({ filesystemPath: FILESYSTEM_PATH }, null),
      ).toBe('vscode://file/work/repo');
    });
  });

  describe('when a default editor is set', () => {
    it('opens the folder in Cursor', () => {
      expect(
        getCheckoutEditorLink(
          { filesystemPath: FILESYSTEM_PATH },
          WorkspaceEditorId.Cursor,
        ),
      ).toBe('cursor://file/work/repo');
    });

    it('opens the folder in Claude Code', () => {
      expect(
        getCheckoutEditorLink(
          { filesystemPath: FILESYSTEM_PATH },
          WorkspaceEditorId.Claude,
        ),
      ).toBe('claude://code/new?folder=%2Fwork%2Frepo');
    });
  });

  describe('when the checkout path is empty', () => {
    it('returns null rather than a dead link', () => {
      expect(
        getCheckoutEditorLink({ filesystemPath: '' }, WorkspaceEditorId.Cursor),
      ).toBeNull();
    });
  });
});
