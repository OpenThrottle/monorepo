import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { EditorPresenceState } from '~/__generated__/graphql';
import { WorkspaceEditorPresenceMarker } from '../WorkspaceEditorPresenceMarker';
import type { WorkspaceEditorPresenceMarkerProps } from '../WorkspaceEditorPresenceMarker';

const renderMarker = (
  props: WorkspaceEditorPresenceMarkerProps,
): RenderResult => {
  const Component = () => <WorkspaceEditorPresenceMarker {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('WorkspaceEditorPresenceMarker Component', () => {
  test('states the detection in text, not only in color', () => {
    const component = renderMarker({
      editorLabel: 'Cursor',
      presence: EditorPresenceState.Installed,
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceMarker-INSTALLED'),
    ).toBeInTheDocument();
    expect(
      component.getByText('Cursor was detected on this machine'),
    ).toBeInTheDocument();
  });

  test('gives not-detected its own accessible sentence', () => {
    const component = renderMarker({
      editorLabel: 'Visual Studio Code',
      presence: EditorPresenceState.NotFound,
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceMarker-NOT_FOUND'),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        'Visual Studio Code was not detected on this machine',
      ),
    ).toBeInTheDocument();
  });

  test('renders NOTHING for unknown — no marker, no placeholder', () => {
    const component = renderMarker({
      editorLabel: 'Cursor',
      presence: EditorPresenceState.Unknown,
    });

    expect(
      component.queryByTestId('WorkspaceEditorPresenceMarker-UNKNOWN'),
    ).not.toBeInTheDocument();
    expect(component.queryByText(/Cursor/)).not.toBeInTheDocument();
  });

  test('never renders an interactive control, so it cannot gate anything', () => {
    const component = renderMarker({
      editorLabel: 'Cursor',
      presence: EditorPresenceState.Installed,
    });

    const marker = component.getByTestId(
      'WorkspaceEditorPresenceMarker-INSTALLED',
    );

    expect(marker.querySelectorAll('button')).toHaveLength(0);
    expect(marker.querySelectorAll('input')).toHaveLength(0);
  });
});
