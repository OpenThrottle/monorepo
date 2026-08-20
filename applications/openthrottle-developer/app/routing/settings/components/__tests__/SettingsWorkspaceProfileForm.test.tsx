import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsWorkspaceProfileForm } from '../SettingsWorkspaceProfileForm';
import type { SettingsWorkspaceProfileFormProps } from '../SettingsWorkspaceProfileForm';
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
  worktreeRoot: null,
};

describe('SettingsWorkspaceProfileForm Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceProfileFormProps;

  beforeEach(() => {
    props = { profile };
    component = renderRoutesStub(<SettingsWorkspaceProfileForm {...props} />);
  });

  test('renders the form container', () => {
    expect(
      component.getByTestId('SettingsWorkspaceProfileForm'),
    ).toBeInTheDocument();
  });

  test('seeds contact fields from the profile', () => {
    expect(component.getByLabelText('Display name')).toHaveValue(
      'Matt Scholta',
    );
    expect(component.getByLabelText('Contact email')).toHaveValue(
      'matt@example.com',
    );
  });

  test('renders the save button', () => {
    expect(
      component.getByRole('button', { name: 'Save profile' }),
    ).toBeInTheDocument();
  });

  test('shows an action error when provided', () => {
    component = renderRoutesStub(
      <SettingsWorkspaceProfileForm
        actionError="Something went wrong."
        profile={profile}
      />,
    );

    expect(component.getByText('Something went wrong.')).toBeInTheDocument();
  });

  test('handles a profile with no contact info seeded', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceProfileForm
        profile={{
          ...profile,
          contactDisplayName: null,
          contactEmail: null,
          enabledEditors: [],
        }}
      />,
    );

    expect(component.getByLabelText('Display name')).toHaveValue('');
    expect(component.getByLabelText('Contact email')).toHaveValue('');
  });
});
