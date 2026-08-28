import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { buildWorkspaceEditorTargetGroups } from '../workspace-editor-targets';

const repositories = [
  {
    displayName: 'monorepo',
    filesystemPath: '/Users/dev/openthrottle',
    id: 'repo-1',
  },
  {
    displayName: 'website',
    filesystemPath: '/Users/dev/website',
    id: 'repo-2',
  },
];

describe('buildWorkspaceEditorTargetGroups', () => {
  test('returns nothing when there are no repositories', () => {
    expect(
      buildWorkspaceEditorTargetGroups([], [WorkspaceEditorId.Cursor]),
    ).toEqual([]);
  });

  test('returns nothing when no editors are enabled', () => {
    expect(buildWorkspaceEditorTargetGroups(repositories, [])).toEqual([]);
  });

  test('returns one group per repository carrying every enabled editor', () => {
    const groups = buildWorkspaceEditorTargetGroups(repositories, [
      WorkspaceEditorId.Cursor,
      WorkspaceEditorId.Vscode,
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({
      displayName: 'monorepo',
      editors: [
        { id: WorkspaceEditorId.Cursor, label: 'Cursor' },
        { id: WorkspaceEditorId.Vscode, label: 'Visual Studio Code' },
      ],
      filesystemPath: '/Users/dev/openthrottle',
      id: 'repo-1',
    });
    expect(groups[1]).toEqual({
      displayName: 'website',
      editors: [
        { id: WorkspaceEditorId.Cursor, label: 'Cursor' },
        { id: WorkspaceEditorId.Vscode, label: 'Visual Studio Code' },
      ],
      filesystemPath: '/Users/dev/website',
      id: 'repo-2',
    });
  });
});
