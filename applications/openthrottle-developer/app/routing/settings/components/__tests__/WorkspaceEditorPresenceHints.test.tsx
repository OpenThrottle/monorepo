import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { WorkspaceEditorPresenceHints } from '../WorkspaceEditorPresenceHints';
import type { WorkspaceEditorPresenceHintsProps } from '../WorkspaceEditorPresenceHints';

const renderHints = (
  props: WorkspaceEditorPresenceHintsProps,
): RenderResult => {
  const Component = () => <WorkspaceEditorPresenceHints {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('WorkspaceEditorPresenceHints Component', () => {
  test('shows a quiet affirmative for an installed editor', () => {
    const component = renderHints({
      editors: [
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
      ],
    });

    const hint = component.getByTestId('WorkspaceEditorPresenceHint-CURSOR');

    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent('Cursor');
    expect(hint).toHaveTextContent('detected');
    expect(hint).toHaveAttribute('data-presence', 'INSTALLED');
  });

  test('shows an advisory for a not-found editor that says it can still be enabled', () => {
    const component = renderHints({
      editors: [
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.NotFound,
        },
      ],
    });

    const hint = component.getByTestId('WorkspaceEditorPresenceHint-VSCODE');

    expect(hint).toHaveTextContent('Visual Studio Code');
    expect(hint).toHaveTextContent('not detected');
    // The reassurance is the point: this must not read as an error or a blocker.
    expect(hint).toHaveTextContent('you can still enable it');
    expect(hint).toHaveAttribute('data-presence', 'NOT_FOUND');
  });

  test('renders NOTHING for an unknown editor — no badge, no placeholder', () => {
    const component = renderHints({
      editors: [
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Unknown,
        },
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.Unknown,
        },
      ],
    });

    // This is the container-backed-server case. Silence is the correct output.
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHint-CURSOR'),
    ).not.toBeInTheDocument();
    expect(component.queryByText(/machine/i)).not.toBeInTheDocument();
  });

  test('omits only the unknown entries from a mixed set', () => {
    const component = renderHints({
      editors: [
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.Unknown,
        },
      ],
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceHint-CURSOR'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHint-VSCODE'),
    ).not.toBeInTheDocument();
  });

  test('renders nothing when the presence query failed', () => {
    const component = renderHints({ editors: null });

    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
  });

  test('renders nothing when no editors were returned', () => {
    const component = renderHints({ editors: [] });

    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
  });

  test('never renders an interactive control, so it cannot gate anything', () => {
    const component = renderHints({
      editors: [
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.NotFound,
        },
      ],
    });

    const hints = component.getByTestId('WorkspaceEditorPresenceHints');

    expect(hints.querySelectorAll('button')).toHaveLength(0);
    expect(hints.querySelectorAll('input')).toHaveLength(0);
  });
});
