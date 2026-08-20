import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { buildWorkspaceApplyResults } from '../workspace-apply-results';

const application = {
  editor: WorkspaceEditorId.Vscode,
  filesWritten: ['.vscode/mcp.json'],
  filesystemPath: '/Users/dev/openthrottle',
  repositoryId: 'repo-1',
  warnings: ['Skipped rules'],
};

describe('buildWorkspaceApplyResults', () => {
  test('resolves the repository display name and editor label', () => {
    expect(
      buildWorkspaceApplyResults(
        [application],
        [{ displayName: 'monorepo', id: 'repo-1' }],
      ),
    ).toEqual([
      {
        displayName: 'monorepo',
        editorLabel: 'Visual Studio Code',
        filesWritten: ['.vscode/mcp.json'],
        filesystemPath: '/Users/dev/openthrottle',
        repositoryId: 'repo-1',
        warnings: ['Skipped rules'],
      },
    ]);
  });

  test('falls back to the filesystem path for unlinked repositories', () => {
    const [result] = buildWorkspaceApplyResults([application], []);

    expect(result.displayName).toBe('/Users/dev/openthrottle');
  });

  test('returns nothing when no applications ran', () => {
    expect(buildWorkspaceApplyResults([], [])).toEqual([]);
  });
});
