import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsWorkspaceEditorsForm } from '../SettingsWorkspaceEditorsForm';
import type { SettingsWorkspaceEditorsFormProps } from '../SettingsWorkspaceEditorsForm';
import type { UserWorkspaceProfileFieldsFragment } from '~/__generated__/graphql';
import { WorkspaceEditorId } from '~/__generated__/graphql';
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
});
