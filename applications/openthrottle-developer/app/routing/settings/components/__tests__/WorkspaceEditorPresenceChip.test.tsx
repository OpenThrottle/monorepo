import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { WorkspaceEditorPresenceChip } from '../WorkspaceEditorPresenceChip';
import type { WorkspaceEditorPresenceChipProps } from '../WorkspaceEditorPresenceChip';

const renderChip = (props: WorkspaceEditorPresenceChipProps): RenderResult => {
  const Component = () => <WorkspaceEditorPresenceChip {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('WorkspaceEditorPresenceChip Component', () => {
  test('names the editor and its detection state', () => {
    const component = renderChip({
      editor: WorkspaceEditorId.Cursor,
      editorLabel: 'Cursor',
      presence: EditorPresenceState.Installed,
    });

    const chip = component.getByTestId('WorkspaceEditorPresenceHint-CURSOR');

    expect(chip).toHaveTextContent('Cursor');
    expect(chip).toHaveTextContent('detected');
    expect(chip).toHaveAttribute('data-presence', 'INSTALLED');
  });

  test('dims the whole chip for not-detected instead of only its icon', () => {
    const component = renderChip({
      editor: WorkspaceEditorId.Vscode,
      editorLabel: 'Visual Studio Code',
      presence: EditorPresenceState.NotFound,
    });

    const chip = component.getByTestId('WorkspaceEditorPresenceHint-VSCODE');

    expect(chip).toHaveTextContent('not detected');
    expect(chip).toHaveAttribute('data-presence', 'NOT_FOUND');
    expect(chip.className).toContain('opacity-80');
  });

  test('renders NOTHING for unknown', () => {
    const component = renderChip({
      editor: WorkspaceEditorId.Claude,
      editorLabel: 'Claude Code',
      presence: EditorPresenceState.Unknown,
    });

    expect(
      component.queryByTestId('WorkspaceEditorPresenceHint-CLAUDE'),
    ).not.toBeInTheDocument();
  });
});
