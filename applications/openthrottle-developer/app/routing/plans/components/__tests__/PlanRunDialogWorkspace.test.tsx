import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';

import type { PlanRunDialogWorkspaceProps } from '../PlanRunDialogWorkspace';
import { PlanRunDialogWorkspace } from '../PlanRunDialogWorkspace';

const REPOSITORIES: PlanRunConfigRepositoryFieldsFragment[] = [
  {
    checkouts: [
      {
        displayName: 'monorepo (main checkout)',
        filesystemPath: '/work/monorepo',
        id: 'checkout-1',
        inspection: null,
        kind: 'checkout',
        managed: false,
      },
    ],
    defaultBranch: 'main',
    id: 'repo-1',
    name: 'monorepo',
    normalizedRemoteUrl: 'github.com/acme/monorepo',
    projectId: null,
  },
];

describe('PlanRunDialogWorkspace Component', () => {
  let props: PlanRunDialogWorkspaceProps;

  const renderWorkspace = (): RenderResult => {
    const Component = (): React.ReactElement => {
      return <PlanRunDialogWorkspace {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      branch: 'feat/run-dialog',
      checkoutId: 'checkout-1',
      onNavigate: vi.fn(),
      repositories: REPOSITORIES,
      workingDirectory: '',
    };
  });

  test('shows the branch and names the checkout, read-only', () => {
    const component = renderWorkspace();

    expect(
      component.getByTestId('PlanRunDialogWorkspace-branch'),
    ).toHaveTextContent('feat/run-dialog');
    expect(
      component.getByTestId('PlanRunDialogWorkspace-checkout'),
    ).toHaveTextContent('monorepo (main checkout)');
    expect(component.container.querySelector('input')).toBeNull();
  });

  test('falls back to the working directory, then to "no checkout"', () => {
    props = { ...props, checkoutId: '', workingDirectory: '/work/other' };
    const withDirectory = renderWorkspace();

    expect(
      withDirectory.getByTestId('PlanRunDialogWorkspace-checkout'),
    ).toHaveTextContent('/work/other');
    withDirectory.unmount();

    props = { ...props, workingDirectory: '' };
    const none = renderWorkspace();

    expect(
      none.getByTestId('PlanRunDialogWorkspace-checkout'),
    ).toHaveTextContent('No checkout selected');
  });

  test('renders a blank branch as not set', () => {
    props = { ...props, branch: '' };
    const component = renderWorkspace();

    expect(
      component.getByTestId('PlanRunDialogWorkspace-branch'),
    ).toHaveTextContent('—');
  });

  test('links to the Configuration tab and tells the dialog to close', async () => {
    const user = userEvent.setup();
    const component = renderWorkspace();
    const link = component.getByRole('link', {
      name: 'Change in Configuration',
    });

    expect(link).toHaveAttribute('href', '/?tab=configuration');

    await user.click(link);

    expect(props.onNavigate).toHaveBeenCalledTimes(1);
  });
});
