import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { isWorkspaceEditorId } from './is-workspace-editor-id';

describe('isWorkspaceEditorId', () => {
  test('accepts the CURSOR workspace editor id', () => {
    expect(isWorkspaceEditorId(WorkspaceEditorId.Cursor)).toBe(true);
  });

  test('accepts the VSCODE workspace editor id', () => {
    expect(isWorkspaceEditorId(WorkspaceEditorId.Vscode)).toBe(true);
  });

  test('rejects an unrecognized editor id', () => {
    expect(isWorkspaceEditorId('SUBLIME')).toBe(false);
  });

  test('rejects a lowercase variant of a known id', () => {
    expect(isWorkspaceEditorId('cursor')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isWorkspaceEditorId('')).toBe(false);
  });
});
