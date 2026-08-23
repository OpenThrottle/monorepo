import { describe, expect, test } from 'vitest';
import type { UserWorkspaceSettings } from '@openthrottle/nestjs-repositories';
import { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';
import { toUserWorkspaceProfileObject } from './user-workspace-profile.mapper';

describe('toUserWorkspaceProfileObject', () => {
  test('maps enabled editor ids to GraphQL enum values', () => {
    const settings: UserWorkspaceSettings = {
      contactDisplayName: 'Matt',
      contactEmail: 'matt@example.com',
      createdAt: new Date('2026-05-18T12:00:00.000Z'),
      enabledEditors: ['cursor', 'vscode'],
      updatedAt: new Date('2026-05-18T12:00:00.000Z'),
      userId: '11111111-1111-4111-8111-111111111111',
      worktreeRoot: '/Users/matt/Development/openthrottle-worktrees',
    };

    const result = toUserWorkspaceProfileObject(settings);

    expect(result.enabledEditors).toEqual([
      WorkspaceEditorIdEnum.CURSOR,
      WorkspaceEditorIdEnum.VSCODE,
    ]);
  });

  test('carries the configured worktree root through', () => {
    const settings: UserWorkspaceSettings = {
      contactDisplayName: null,
      contactEmail: null,
      createdAt: new Date('2026-05-18T12:00:00.000Z'),
      enabledEditors: [],
      updatedAt: new Date('2026-05-18T12:00:00.000Z'),
      userId: '11111111-1111-4111-8111-111111111111',
      worktreeRoot: '/srv/worktrees',
    };

    expect(toUserWorkspaceProfileObject(settings).worktreeRoot).toBe(
      '/srv/worktrees',
    );
  });
});
