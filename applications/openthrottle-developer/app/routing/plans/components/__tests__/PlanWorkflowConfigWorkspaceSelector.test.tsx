import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import {
  PlanWorkflowConfigWorkspaceSelector,
  type PlanWorkflowConfigWorkspaceSelectorProps,
} from '../PlanWorkflowConfigWorkspaceSelector';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';

const checkout = (
  overrides: Partial<
    PlanRunConfigRepositoryFieldsFragment['checkouts'][number]
  >,
): PlanRunConfigRepositoryFieldsFragment['checkouts'][number] => ({
  displayName: 'openthrottle',
  filesystemPath: '/Users/matt/Development/openthrottle',
  id: 'checkout-1',
  inspection: { git: { currentBranch: 'main' } },
  kind: 'primary',
  managed: false,
  ...overrides,
});

const repo = (
  overrides: Partial<PlanRunConfigRepositoryFieldsFragment>,
): PlanRunConfigRepositoryFieldsFragment => ({
  checkouts: [checkout({})],
  id: 'repo-1',
  name: 'OpenThrottle/monorepo',
  normalizedRemoteUrl: 'github.com/openthrottle/monorepo',
  projectId: 'proj-1',
  ...overrides,
});

const noop = (): void => undefined;

const baseProps: PlanWorkflowConfigWorkspaceSelectorProps = {
  checkoutId: '',
  heading: '02. Workspace',
  onCheckoutIdChange: noop,
  onRepositoryIdChange: noop,
  onWorkingDirectoryChange: noop,
  repositories: [],
  repositoryId: '',
  workingDirectory: '',
};

const renderSelector = (
  props: PlanWorkflowConfigWorkspaceSelectorProps,
): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => (
    <PlanWorkflowConfigWorkspaceSelector {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('PlanWorkflowConfigWorkspaceSelector Component', () => {
  test('renders the workspace fieldset and select trigger', () => {
    const component = renderSelector(baseProps);

    expect(
      component.getByRole('group', { name: '02. Workspace' }),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('workflow-run-workspace-select'),
    ).toBeInTheDocument();
  });

  test('pre-fills repositoryId for a single project repo with one checkout', () => {
    const onRepositoryIdChange = vi.fn();
    renderSelector({
      ...baseProps,
      onRepositoryIdChange,
      planProjectId: 'proj-1',
      repositories: [repo({})],
    });

    expect(onRepositoryIdChange).toHaveBeenCalledWith('repo-1');
  });

  test('does not pre-fill when the project repo has multiple checkouts', () => {
    const onRepositoryIdChange = vi.fn();
    renderSelector({
      ...baseProps,
      onRepositoryIdChange,
      planProjectId: 'proj-1',
      repositories: [
        repo({
          checkouts: [
            checkout({ id: 'checkout-1' }),
            checkout({ filesystemPath: '/tmp/two', id: 'checkout-2' }),
          ],
        }),
      ],
    });

    expect(onRepositoryIdChange).not.toHaveBeenCalled();
  });

  test('shows the resolved path for a selected checkout', () => {
    const component = renderSelector({
      ...baseProps,
      checkoutId: 'checkout-1',
      repositories: [repo({})],
    });

    expect(
      component.getByText('/Users/matt/Development/openthrottle'),
    ).toBeInTheDocument();
  });

  test('reveals the custom raw-path input and forwards edits', async () => {
    const user = userEvent.setup();
    const onWorkingDirectoryChange = vi.fn();
    const component = renderSelector({
      ...baseProps,
      onWorkingDirectoryChange,
      workingDirectory: '/Users/matt/Development/other',
    });

    const input = component.getByTestId('workflow-run-workspace-path-input');
    expect(input).toBeInTheDocument();

    await user.type(input, '/x');
    expect(onWorkingDirectoryChange).toHaveBeenCalled();
  });
});
