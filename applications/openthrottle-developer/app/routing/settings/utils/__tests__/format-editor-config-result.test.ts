import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { formatEditorConfigApplyMessage } from '~/routing/settings/utils/format-editor-config-result';

describe('formatEditorConfigApplyMessage', () => {
  test('returns guidance when no applications ran', () => {
    expect(
      formatEditorConfigApplyMessage({
        applyWorkspaceEditorConfiguration: { applications: [] },
      }),
    ).toContain('No linked repositories');
  });

  test('summarizes file and warning counts', () => {
    const message = formatEditorConfigApplyMessage({
      applyWorkspaceEditorConfiguration: {
        applications: [
          {
            editor: WorkspaceEditorId.Cursor,
            filesWritten: ['.cursor/mcp.json'],
            filesystemPath: '/repo',
            repositoryId: 'id-1',
            warnings: [],
          },
          {
            editor: WorkspaceEditorId.Vscode,
            filesWritten: [
              '.vscode/mcp.json',
              '.openthrottle/workspace-editors.json',
            ],
            filesystemPath: '/repo',
            repositoryId: 'id-1',
            warnings: ['Skipped MCP config'],
          },
        ],
      },
    });

    expect(message).toContain('2 editor/repo pairing');
    expect(message).toContain('3 file');
    expect(message).toContain('1 warning');
  });
});
