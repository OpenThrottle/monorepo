import { describe, expect, it } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  getCheckoutEditorLink,
  getCheckoutFileEditorLink,
} from '~/global/utils/getCheckoutEditorLink';

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

describe('getCheckoutFileEditorLink', () => {
  const checkout = FILESYSTEM_PATH;

  it('is null without a checkout path or a path', () => {
    expect(getCheckoutFileEditorLink(undefined, null, 'a.ts')).toBeNull();
    expect(getCheckoutFileEditorLink('', null, 'a.ts')).toBeNull();
    expect(getCheckoutFileEditorLink(checkout, null, '')).toBeNull();
  });

  it('defaults to VS Code and joins a relative path onto the checkout', () => {
    expect(getCheckoutFileEditorLink(checkout, null, 'src/a.ts')).toBe(
      'vscode://file/work/repo/src/a.ts',
    );
  });

  it('uses Cursor when it is the default editor', () => {
    expect(
      getCheckoutFileEditorLink(checkout, WorkspaceEditorId.Cursor, 'src/a.ts'),
    ).toBe('cursor://file/work/repo/src/a.ts');
  });

  it('falls back to VS Code when the default (Claude Code) opens folders only', () => {
    expect(
      getCheckoutFileEditorLink(checkout, WorkspaceEditorId.Claude, 'src/a.ts'),
    ).toBe('vscode://file/work/repo/src/a.ts');
  });

  it('percent-encodes spaces and keeps an absolute path as is', () => {
    expect(
      getCheckoutFileEditorLink('/work/my repo/', null, './src/a b.ts'),
    ).toBe('vscode://file/work/my%20repo/src/a%20b.ts');
    expect(getCheckoutFileEditorLink(checkout, null, '/abs/x y.ts')).toBe(
      'vscode://file/abs/x%20y.ts',
    );
  });
});
