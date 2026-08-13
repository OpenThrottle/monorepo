import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  WORKSPACE_EDITOR_AFFILIATE_LINKS,
  getWorkspaceEditorAffiliateUrl,
} from '../workspace-editor-affiliate-links';

describe('workspace-editor-affiliate-links', () => {
  test('maps Cursor to its referral URL and VS Code to null', () => {
    expect(
      WORKSPACE_EDITOR_AFFILIATE_LINKS[WorkspaceEditorId.Cursor],
    ).toContain('cursor.com/referral');
    expect(
      WORKSPACE_EDITOR_AFFILIATE_LINKS[WorkspaceEditorId.Vscode],
    ).toBeNull();
  });

  test('getWorkspaceEditorAffiliateUrl returns the URL or null per editor', () => {
    expect(getWorkspaceEditorAffiliateUrl(WorkspaceEditorId.Cursor)).toBe(
      WORKSPACE_EDITOR_AFFILIATE_LINKS[WorkspaceEditorId.Cursor],
    );
    expect(getWorkspaceEditorAffiliateUrl(WorkspaceEditorId.Vscode)).toBeNull();
  });
});
