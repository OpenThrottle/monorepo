import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  getWorkspaceEditorDeepLink,
  WORKSPACE_EDITOR_DEEP_LINKS,
} from '../workspace-editor-deep-links';

const PLAN_ID = 'ec3dcee9-36e6-4ecb-876a-f689723f6db4';
const WORKING_DIRECTORY = '/Users/matt/Development/openthrottle';

const claude = WORKSPACE_EDITOR_DEEP_LINKS[WorkspaceEditorId.Claude];
const cursor = WORKSPACE_EDITOR_DEEP_LINKS[WorkspaceEditorId.Cursor];
const vscode = WORKSPACE_EDITOR_DEEP_LINKS[WorkspaceEditorId.Vscode];

describe('workspace editor deep links', () => {
  test('builds the exact Claude plan href for a known plan and path', () => {
    expect(
      claude.buildPlanHref({
        planId: PLAN_ID,
        workingDirectory: WORKING_DIRECTORY,
      }),
    ).toBe(
      `claude://code/new?folder=%2FUsers%2Fmatt%2FDevelopment%2Fopenthrottle%2F&q=%2Fot-claude-loop%20${PLAN_ID}`,
    );
  });

  test('percent-encodes spaces and `#` in the Claude folder param', () => {
    expect(claude.buildFolderHref('/abs/my dir/a#b')).toBe(
      'claude://code/new?folder=%2Fabs%2Fmy%20dir%2Fa%23b',
    );
  });

  test('omits a folder from the Cursor plan href and names the skill file', () => {
    const href = cursor.buildPlanHref({
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(href).toBe(
      `cursor://anysphere.cursor-deeplink/prompt?text=Run%20OpenThrottle%20plan%20${PLAN_ID}%20following%20.agents%2Fskills%2Fot-claude-loop%2FSKILL.md`,
    );
    expect(href).not.toContain('folder');
  });

  test('builds the Cursor plan href even without a working directory', () => {
    expect(
      cursor.buildPlanHref({ planId: PLAN_ID, workingDirectory: '' }),
    ).not.toBeNull();
    expect(cursor.promptTargetsFocusedWindow).toBe(true);
  });

  test('keeps the VS Code href as a plain open-folder link', () => {
    const expected = 'vscode://file/Users/matt/Development/openthrottle';

    expect(
      vscode.buildPlanHref({
        planId: PLAN_ID,
        workingDirectory: WORKING_DIRECTORY,
      }),
    ).toBe(expected);
    expect(vscode.buildFolderHref(WORKING_DIRECTORY)).toBe(expected);
  });

  test('returns null for folder-based editors when no directory resolved', () => {
    expect(
      claude.buildPlanHref({ planId: PLAN_ID, workingDirectory: '' }),
    ).toBeNull();
    expect(
      vscode.buildPlanHref({ planId: PLAN_ID, workingDirectory: '' }),
    ).toBeNull();
    expect(claude.buildFolderHref('')).toBeNull();
    expect(cursor.buildFolderHref('')).toBeNull();
    expect(vscode.buildFolderHref('')).toBeNull();
  });

  test('resolves metadata by editor id', () => {
    expect(getWorkspaceEditorDeepLink(WorkspaceEditorId.Claude)).toBe(claude);
  });
});
