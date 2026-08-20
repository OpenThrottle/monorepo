import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { buildWorkspaceEditorTargets } from '../workspace-editor-targets';

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

describe('buildWorkspaceEditorTargets', () => {
  test('returns nothing when there are no repositories', () => {
    expect(buildWorkspaceEditorTargets([], [WorkspaceEditorId.Cursor])).toEqual(
      [],
    );
  });

  test('returns nothing when no editors are enabled', () => {
    expect(buildWorkspaceEditorTargets(repositories, [])).toEqual([]);
  });

  test('pairs every repository with every enabled editor', () => {
    const targets = buildWorkspaceEditorTargets(repositories, [
      WorkspaceEditorId.Cursor,
      WorkspaceEditorId.Vscode,
    ]);

    expect(targets).toHaveLength(4);
    expect(targets[0]).toEqual({
      displayName: 'monorepo',
      editor: WorkspaceEditorId.Cursor,
      editorLabel: 'Cursor',
      filesystemPath: '/Users/dev/openthrottle',
      id: 'repo-1',
    });
    expect(targets[3]).toEqual({
      displayName: 'website',
      editor: WorkspaceEditorId.Vscode,
      editorLabel: 'Visual Studio Code',
      filesystemPath: '/Users/dev/website',
      id: 'repo-2',
    });
  });
});
