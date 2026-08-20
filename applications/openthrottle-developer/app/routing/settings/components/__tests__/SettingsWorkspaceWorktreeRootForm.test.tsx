import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsWorkspaceWorktreeRootForm } from '../SettingsWorkspaceWorktreeRootForm';
import type { SettingsWorkspaceWorktreeRootFormProps } from '../SettingsWorkspaceWorktreeRootForm';
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
  worktreeRoot: '/Users/matt/Development/openthrottle-worktrees',
};

describe('SettingsWorkspaceWorktreeRootForm Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceWorktreeRootFormProps;

  beforeEach(() => {
    props = { profile };
    component = renderRoutesStub(
      <SettingsWorkspaceWorktreeRootForm {...props} />,
    );
  });

  test('renders the form container', () => {
    expect(
      component.getByTestId('SettingsWorkspaceWorktreeRootForm'),
    ).toBeInTheDocument();
  });

  test('seeds the worktree root from the profile', () => {
    expect(component.getByLabelText('Worktree root')).toHaveValue(
      '/Users/matt/Development/openthrottle-worktrees',
    );
  });

  test('renders an empty field when no root is configured', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceWorktreeRootForm
        profile={{ ...profile, worktreeRoot: null }}
      />,
    );

    expect(component.getByLabelText('Worktree root')).toHaveValue('');
  });

  test('carries the contact fields so the shared intent stays whole', () => {
    const form = component
      .getByTestId('SettingsWorkspaceWorktreeRootForm')
      .querySelector('form');

    expect(form?.querySelector('input[name="contactDisplayName"]')).toHaveValue(
      'Matt Scholta',
    );
    expect(form?.querySelector('input[name="enabledEditors"]')).toHaveValue(
      WorkspaceEditorId.Cursor,
    );
  });

  test('shows an action error when provided', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsWorkspaceWorktreeRootForm
        actionError="Something went wrong."
        profile={profile}
      />,
    );

    expect(component.getByText('Something went wrong.')).toBeInTheDocument();
  });
});
