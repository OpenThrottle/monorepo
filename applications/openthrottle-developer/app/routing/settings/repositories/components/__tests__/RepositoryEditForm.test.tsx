import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, redirect } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RepositoryEditForm } from '../RepositoryEditForm';
import type { RepositoryEditFormProps } from '../RepositoryEditForm';

const repository = {
  checkouts: [],
  createdAt: '2026-07-24T00:00:00.000Z',
  defaultBranch: 'main',
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'https://github.com/acme/monorepo',
  project: null,
  projectId: null,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

describe('RepositoryEditForm Component', () => {
  let component: RenderResult;
  let props: RepositoryEditFormProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  const setup = (): void => {
    const Component = () => <RepositoryEditForm {...props} />;
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            defaultBranch: formData.get('defaultBranch'),
            foreignSkillInjectionEnabled: formData.get(
              'foreignSkillInjectionEnabled',
            ),
            intent: formData.get('intent'),
            name: formData.get('name'),
            projectId: formData.get('projectId'),
          });
          return redirect('/detail');
        },
        path: '/edit',
      },
      { path: '/detail' },
    ]);
    component = render(<RoutesStub initialEntries={['/edit']} />);
  };

  beforeEach(() => {
    submitted = [];
    props = {
      cancelTo: '/detail',
      projects: [{ id: 'project-1', name: 'Platform' }],
      repository,
    };
  });

  test('seeds the form with the current name and default branch', () => {
    setup();

    expect(component.getByLabelText('Name')).toHaveValue('monorepo');
    expect(component.getByLabelText('Default branch')).toHaveValue('main');
  });

  test('submits the edited name and redirects to the detail route', async () => {
    const user = userEvent.setup();
    setup();

    const nameInput = component.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'acme/monorepo');
    await user.click(component.getByRole('button', { name: /Save changes/ }));

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toEqual({
      defaultBranch: 'main',
      foreignSkillInjectionEnabled: 'false',
      intent: 'updateRepository',
      name: 'acme/monorepo',
      projectId: '__none__',
    });
    // The action's redirect navigates away from the edit route.
    await waitFor(() =>
      expect(
        component.queryByTestId('RepositoryEditForm'),
      ).not.toBeInTheDocument(),
    );
  });

  test('submits the injection toggle as true once enabled', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(component.getByTestId('RepositoryEditForm-injection'));
    await user.click(component.getByRole('button', { name: /Save changes/ }));

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.foreignSkillInjectionEnabled).toBe('true');
  });

  test('seeds the injection toggle from an opted-in checkout', () => {
    props.repository = {
      ...repository,
      checkouts: [
        {
          createdAt: '2026-07-24T00:00:00.000Z',
          displayName: 'monorepo',
          filesystemPath: '/Users/dev/Development/openthrottle',
          foreignSkillInjectionEnabled: true,
          id: 'checkout-1',
          inspection: null,
          kind: 'primary',
          managed: false,
          repositoryId: 'repo-1',
          scannedAt: null,
          updatedAt: '2026-07-24T00:00:00.000Z',
          userId: 'user-1',
        },
      ],
    };
    setup();

    expect(component.getByTestId('RepositoryEditForm-injection')).toBeChecked();
  });

  test('surfaces an action error inline', () => {
    props.actionError = 'Repository name cannot be empty';
    setup();

    expect(
      component.getByText('Repository name cannot be empty'),
    ).toBeInTheDocument();
  });
});
