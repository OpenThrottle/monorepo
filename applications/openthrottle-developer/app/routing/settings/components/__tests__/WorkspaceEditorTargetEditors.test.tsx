import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { buildEditorPresenceIndex } from '~/routing/settings/utils/workspace-editor-presence-status';
import { WorkspaceEditorTargetEditors } from '../WorkspaceEditorTargetEditors';
import type { WorkspaceEditorTargetEditorsProps } from '../WorkspaceEditorTargetEditors';

const editors = [
  { id: WorkspaceEditorId.Claude, label: 'Claude Code' },
  { id: WorkspaceEditorId.Cursor, label: 'Cursor' },
  { id: WorkspaceEditorId.Vscode, label: 'Visual Studio Code' },
];

const mixedPresence = buildEditorPresenceIndex([
  { editor: WorkspaceEditorId.Claude, presence: EditorPresenceState.Installed },
  { editor: WorkspaceEditorId.Cursor, presence: EditorPresenceState.NotFound },
  { editor: WorkspaceEditorId.Vscode, presence: EditorPresenceState.Unknown },
]);

const renderEditors = (
  props: Partial<WorkspaceEditorTargetEditorsProps> = {},
): RenderResult =>
  render(<WorkspaceEditorTargetEditors editors={editors} {...props} />);

describe('WorkspaceEditorTargetEditors Component', () => {
  test('marks each badge with its detection state', () => {
    const component = renderEditors({ presence: mixedPresence });

    expect(
      component.getByTestId('WorkspaceEditorTargetEditor-CLAUDE'),
    ).toHaveAttribute('data-presence', 'INSTALLED');
    expect(
      component.getByTestId('WorkspaceEditorTargetEditor-CURSOR'),
    ).toHaveAttribute('data-presence', 'NOT_FOUND');
  });

  test('carries the state as a tooltip and as accessible text, not only as color', () => {
    const component = renderEditors({ presence: mixedPresence });

    expect(
      component.getByTestId('WorkspaceEditorTargetEditor-CURSOR'),
    ).toHaveAttribute('title', 'Cursor was not detected on this machine');
    expect(
      component.getByText('Cursor was not detected on this machine'),
    ).toBeInTheDocument();
  });

  test('a not-detected editor still gets a badge — nothing is dropped or disabled', () => {
    const component = renderEditors({ presence: mixedPresence });

    const badge = component.getByTestId('WorkspaceEditorTargetEditor-CURSOR');

    expect(badge).toHaveTextContent('Cursor');
    expect(badge).not.toHaveAttribute('aria-disabled');
  });

  test('an unknown editor gets a badge with no marker and no tooltip', () => {
    const component = renderEditors({ presence: mixedPresence });

    const badge = component.getByTestId('WorkspaceEditorTargetEditor-VSCODE');

    expect(badge).toHaveTextContent('Visual Studio Code');
    expect(badge).not.toHaveAttribute('title');
    expect(
      component.queryByTestId('WorkspaceEditorPresenceMarker-UNKNOWN'),
    ).not.toBeInTheDocument();
  });

  test('renders every badge unchanged when the probe failed', () => {
    const component = renderEditors({ presence: null });

    for (const editor of editors) {
      const badge = component.getByTestId(
        `WorkspaceEditorTargetEditor-${editor.id}`,
      );

      expect(badge).toHaveTextContent(editor.label);
      expect(badge).not.toHaveAttribute('title');
    }

    expect(component.queryByText(/detected/i)).not.toBeInTheDocument();
  });
});
