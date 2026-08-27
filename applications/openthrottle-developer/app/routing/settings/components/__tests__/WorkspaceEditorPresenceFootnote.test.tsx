import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { WorkspaceEditorPresenceFootnote } from '../WorkspaceEditorPresenceFootnote';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('WorkspaceEditorPresenceFootnote Component', () => {
  let component: RenderResult;

  test('renders nothing when no probe returned', () => {
    component = renderRoutesStub(<WorkspaceEditorPresenceFootnote />);

    expect(
      component.queryByTestId('WorkspaceEditorPresenceFootnote'),
    ).not.toBeInTheDocument();
  });

  test('states when the host was last scanned', () => {
    component = renderRoutesStub(
      <WorkspaceEditorPresenceFootnote
        scannedAt="2026-08-27T00:00:00.000Z"
        trusted={true}
      />,
    );

    expect(
      component.getByTestId('WorkspaceEditorPresenceFootnote'),
    ).toHaveTextContent('Editors last scanned');
  });

  test('renders when the scalar arrives as a Date, not a string', () => {
    // The live bug this guards: codegen types scannedAt as string, but the
    // DateTime scalar deserializes to a Date, which a string-only guard
    // silently dropped — hiding the footnote in the running app only.
    component = renderRoutesStub(
      <WorkspaceEditorPresenceFootnote
        scannedAt={new Date('2026-08-27T00:00:00.000Z')}
        trusted={true}
      />,
    );

    expect(
      component.getByTestId('WorkspaceEditorPresenceFootnote'),
    ).toHaveTextContent('Editors last scanned');
  });

  test('an untrusted scan reads as unverified, not as missing', () => {
    component = renderRoutesStub(
      <WorkspaceEditorPresenceFootnote
        scannedAt="2026-08-27T00:00:00.000Z"
        trusted={false}
      />,
    );

    const footnote = component.getByTestId('WorkspaceEditorPresenceFootnote');

    expect(footnote).toHaveTextContent('could not verify the host filesystem');
    expect(footnote).not.toHaveTextContent('not detected');
  });
});
