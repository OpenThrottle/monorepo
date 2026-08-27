import * as React from 'react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsWorkspaceEditorsForm } from '../SettingsWorkspaceEditorsForm';
import type { SettingsWorkspaceEditorsFormProps } from '../SettingsWorkspaceEditorsForm';
import type {
  GetEditorPresenceQuery,
  UserWorkspaceProfileFieldsFragment,
} from '~/__generated__/graphql';
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
  worktreeRoot: null,
};

const presenceWith = (
  editors: readonly {
    editor: WorkspaceEditorId;
    presence: EditorPresenceState;
  }[],
  options?: { readonly trusted?: boolean },
): GetEditorPresenceQuery['editorPresence'] => ({
  __typename: 'EditorPresenceResultObject',
  editors: editors.map((entry) => ({
    __typename: 'EditorPresenceObject',
    editor: entry.editor,
    presence: entry.presence,
  })),
  scannedAt: '2026-08-27T00:00:00.000Z',
  trusted: options?.trusted ?? true,
});

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

  test('renders one card per editor in the catalog, not per probed editor', () => {
    expect(component.getAllByTestId('WorkspaceEditorCard')).toHaveLength(3);
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

  test('renders no presence affordances when the probe query failed', () => {
    // Presence is a nicety; losing it must be invisible rather than degrading the form.
    expect(
      component.queryByTestId('WorkspaceEditorPresenceFootnote'),
    ).not.toBeInTheDocument();
    expect(component.queryByText('Detected')).not.toBeInTheDocument();
    expect(component.queryByText('Not detected')).not.toBeInTheDocument();
  });

  test('badges each card from the probe when it ran', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={presenceWith([
          {
            editor: WorkspaceEditorId.Cursor,
            presence: EditorPresenceState.Installed,
          },
          {
            editor: WorkspaceEditorId.Vscode,
            presence: EditorPresenceState.NotFound,
          },
        ])}
        profile={profile}
      />,
    );

    expect(component.getByText('Detected')).toBeInTheDocument();
    expect(component.getByText('Not detected')).toBeInTheDocument();
    // Claude was omitted from the probe entirely; it must still render, unbadged.
    expect(
      component
        .getAllByTestId('WorkspaceEditorCard')
        .find((card) => card.dataset.editor === WorkspaceEditorId.Claude)
        ?.dataset.presence,
    ).toBe('');
  });

  test('a NOT_FOUND editor still submits and never disables the save button', async () => {
    // The negative the plan cares about: detection must not have become a gate.
    const user = userEvent.setup();

    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={presenceWith([
          {
            editor: WorkspaceEditorId.Cursor,
            presence: EditorPresenceState.NotFound,
          },
        ])}
        profile={profile}
      />,
    );

    const form = component.getByTestId('SettingsWorkspaceEditorsForm');

    // Cursor is enabled in the profile and reports NOT_FOUND; it must still be in the
    // submitted payload, untouched by detection.
    expect(
      form.querySelector('input[name="enabledEditors"][value="CURSOR"]'),
    ).toBeInTheDocument();

    // Its switch is live, and using it enables Save — detection gates neither.
    const cursorSwitch = component.getByTestId(
      `WorkspaceEditorCard-switch-${WorkspaceEditorId.Cursor}`,
    );
    expect(cursorSwitch).toBeEnabled();

    await user.click(cursorSwitch);

    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeEnabled();
  });

  test('an all-UNKNOWN probe leaves the cards entirely unbadged', () => {
    // The container-backed-server case: full control, zero claims.
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={presenceWith(
          [
            {
              editor: WorkspaceEditorId.Cursor,
              presence: EditorPresenceState.Unknown,
            },
            {
              editor: WorkspaceEditorId.Vscode,
              presence: EditorPresenceState.Unknown,
            },
          ],
          { trusted: false },
        )}
        profile={profile}
      />,
    );

    const form = component.getByTestId('SettingsWorkspaceEditorsForm');

    expect(component.queryByText('Detected')).not.toBeInTheDocument();
    expect(component.queryByText('Not detected')).not.toBeInTheDocument();
    // The selection control and the stored value are untouched: full control retained.
    expect(component.getByText('Editors to configure')).toBeInTheDocument();
    expect(
      form.querySelector('input[name="enabledEditors"][value="CURSOR"]'),
    ).toBeInTheDocument();
  });

  test('toggling a card adds and removes the hidden input it posts', async () => {
    const user = userEvent.setup();
    const form = component.getByTestId('SettingsWorkspaceEditorsForm');

    expect(
      form.querySelector('input[name="enabledEditors"][value="CLAUDE"]'),
    ).not.toBeInTheDocument();

    await user.click(
      component.getByTestId(
        `WorkspaceEditorCard-switch-${WorkspaceEditorId.Claude}`,
      ),
    );

    expect(
      form.querySelector('input[name="enabledEditors"][value="CLAUDE"]'),
    ).toBeInTheDocument();

    await user.click(
      component.getByTestId(
        `WorkspaceEditorCard-switch-${WorkspaceEditorId.Cursor}`,
      ),
    );

    expect(
      form.querySelector('input[name="enabledEditors"][value="CURSOR"]'),
    ).not.toBeInTheDocument();
  });

  test('save stays disabled until the selection actually changes', async () => {
    const user = userEvent.setup();

    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeDisabled();

    await user.click(
      component.getByTestId(
        `WorkspaceEditorCard-switch-${WorkspaceEditorId.Claude}`,
      ),
    );

    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeEnabled();

    // Toggling back restores the stored selection, so Save goes quiet again.
    await user.click(
      component.getByTestId(
        `WorkspaceEditorCard-switch-${WorkspaceEditorId.Claude}`,
      ),
    );

    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeDisabled();
  });

  test('a reordered stored selection is not mistaken for a change', () => {
    // The two arrays are not guaranteed to share order; a positional compare
    // would report a phantom change here.
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        profile={{
          ...profile,
          enabledEditors: [WorkspaceEditorId.Vscode, WorkspaceEditorId.Claude],
        }}
      />,
    );

    expect(
      component.getByRole('button', { name: 'Save editors' }),
    ).toBeDisabled();
  });

  test('shows the scan footnote only when a probe returned', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceEditorsForm
        editorPresence={presenceWith(
          [
            {
              editor: WorkspaceEditorId.Cursor,
              presence: EditorPresenceState.Installed,
            },
          ],
          { trusted: false },
        )}
        profile={profile}
      />,
    );

    const footnote = component.getByTestId('WorkspaceEditorPresenceFootnote');

    expect(footnote).toHaveTextContent('Editors last scanned');
    expect(footnote).toHaveTextContent('could not verify the host filesystem');
  });

  test('carries exactly one affiliate disclosure, page level', () => {
    expect(component.getAllByText(/affiliate\/referral links/)).toHaveLength(1);
  });
});
