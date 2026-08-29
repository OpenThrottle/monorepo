import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsWorkspaceEditorsForm } from '../SettingsWorkspaceEditorsForm';
import type { SettingsWorkspaceEditorsFormProps } from '../SettingsWorkspaceEditorsForm';
import type { UserWorkspaceProfileFieldsFragment } from '~/__generated__/graphql';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const profile: UserWorkspaceProfileFieldsFragment = {
  __typename: 'UserWorkspaceProfileObject',
  contactDisplayName: 'Matt Scholta',
  contactEmail: 'matt@example.com',
  createdAt: '2026-01-01T00:00:00Z',
  enabledEditors: [WorkspaceEditorId.Cursor],
  updatedAt: '2026-01-02T00:00:00Z',
  userId: 'user-1',
};

describe('SettingsWorkspaceEditorsForm Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceEditorsFormProps;

  beforeEach(() => {
    props = { profile };
    component = renderRoutesStub(<SettingsWorkspaceEditorsForm {...props} />);
  });

  test('renders the editors form and its save button', () => {
    expect(
      component.getByTestId('SettingsWorkspaceEditorsForm'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeInTheDocument();
  });

  test('carries the contact values so the shared intent stays complete', () => {
    const form = component.getByTestId('SettingsWorkspaceEditorsForm');

    expect(form.querySelector('input[name="contactDisplayName"]')).toHaveValue(
      'Matt Scholta',
    );
    expect(form.querySelector('input[name="contactEmail"]')).toHaveValue(
      'matt@example.com',
    );
  });

  test('shows an action error when provided', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        actionError="Something went wrong."
        profile={profile}
      />,
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      'Something went wrong.',
    );
  });

  test('renders no presence hints when the probe query failed', () => {
    // Presence is a nicety; losing it must be invisible rather than degrading the form.
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeEnabled();
  });

  test('renders presence hints alongside the selection when the probe ran', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={{
          __typename: 'EditorPresenceResultObject',
          editors: [
            {
              __typename: 'EditorPresenceObject',
              editor: WorkspaceEditorId.Cursor,
              presence: EditorPresenceState.Installed,
            },
            {
              __typename: 'EditorPresenceObject',
              editor: WorkspaceEditorId.Vscode,
              presence: EditorPresenceState.NotFound,
            },
          ],
          scannedAt: '2026-08-27T00:00:00.000Z',
          trusted: true,
        }}
        profile={profile}
      />,
    );

    expect(
      component.getByTestId('WorkspaceEditorPresenceHints'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('WorkspaceEditorPresenceHint-VSCODE'),
    ).toHaveTextContent('not detected');
  });

  test('a NOT_FOUND editor still submits and never disables the save button', () => {
    // The negative the plan cares about: detection must not have become a gate.
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={{
          __typename: 'EditorPresenceResultObject',
          editors: [
            {
              __typename: 'EditorPresenceObject',
              editor: WorkspaceEditorId.Cursor,
              presence: EditorPresenceState.NotFound,
            },
          ],
          scannedAt: '2026-08-27T00:00:00.000Z',
          trusted: true,
        }}
        profile={profile}
      />,
    );

    const form = component.getByTestId('SettingsWorkspaceEditorsForm');

    // Cursor is enabled in the profile and reports NOT_FOUND; it must still be in the
    // submitted payload, untouched by detection.
    expect(
      form.querySelector('input[name="enabledEditors"][value="CURSOR"]'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeEnabled();
  });

  test('an all-UNKNOWN probe leaves the form entirely unannotated', () => {
    // The container-backed-server case: full control, zero hints.
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={{
          __typename: 'EditorPresenceResultObject',
          editors: [
            {
              __typename: 'EditorPresenceObject',
              editor: WorkspaceEditorId.Cursor,
              presence: EditorPresenceState.Unknown,
            },
            {
              __typename: 'EditorPresenceObject',
              editor: WorkspaceEditorId.Vscode,
              presence: EditorPresenceState.Unknown,
            },
          ],
          scannedAt: '2026-08-27T00:00:00.000Z',
          trusted: false,
        }}
        profile={profile}
      />,
    );

    const form = component.getByTestId('SettingsWorkspaceEditorsForm');

    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
    // The selection control and the stored value are untouched: full control retained.
    expect(component.getByText('Editors to configure')).toBeInTheDocument();
    expect(
      form.querySelector('input[name="enabledEditors"][value="CURSOR"]'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeEnabled();
  });
});
