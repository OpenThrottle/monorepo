import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RECENT_WORKSPACE_PATHS_STORAGE_KEY } from '~/routing/plans/config/defaults';

import type { PlanWorkflowConfigWorkspaceProps } from '../PlanWorkflowConfigWorkspace';
import { PlanWorkflowConfigWorkspace } from '../PlanWorkflowConfigWorkspace';

describe('PlanWorkflowConfigWorkspace Component', () => {
  let onChange: Mock<(path: string) => void>;

  beforeEach(() => {
    onChange = vi.fn<(path: string) => void>();
    localStorage.clear();
  });

  const renderComponent = (
    overrides: Partial<PlanWorkflowConfigWorkspaceProps> = {},
  ) => {
    const props: PlanWorkflowConfigWorkspaceProps = {
      heading: '02. Workspace',
      onChange,
      value: '',
      ...overrides,
    };

    const Component = () => {
      return <PlanWorkflowConfigWorkspace {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  test('should render with empty value', () => {
    const component = renderComponent();

    expect(
      component.getByRole('group', { name: '02. Workspace' }),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('');
  });

  test('should render with a provided value', () => {
    const component = renderComponent({
      value: '/Users/matt/Development/my-project',
    });

    expect(
      component.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('/Users/matt/Development/my-project');
  });

  test('should call onChange when the user types a path', async () => {
    const user = userEvent.setup();
    const component = renderComponent();

    const input = component.getByLabelText(
      'Absolute path to workspace directory',
    );
    await user.type(input, '/');

    expect(onChange).toHaveBeenCalledWith('/');
  });

  test('should show validation error for relative paths', () => {
    const component = renderComponent({ value: 'relative/path' });

    expect(
      component.getByText('Path must be absolute (start with /)'),
    ).toBeInTheDocument();
  });

  test('should show clear button when value is non-empty', () => {
    const component = renderComponent({ value: '/some/path' });

    expect(
      component.getByLabelText('Clear workspace path'),
    ).toBeInTheDocument();
  });

  test('should not show clear button when value is empty', () => {
    const component = renderComponent({ value: '' });

    expect(
      component.queryByLabelText('Clear workspace path'),
    ).not.toBeInTheDocument();
  });

  test('should call onChange with empty string when clear is clicked', async () => {
    const user = userEvent.setup();
    const component = renderComponent({ value: '/some/path' });

    await user.click(component.getByLabelText('Clear workspace path'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  describe('when recent paths exist in localStorage', () => {
    beforeEach(() => {
      localStorage.setItem(
        RECENT_WORKSPACE_PATHS_STORAGE_KEY,
        JSON.stringify(['/Users/matt/project-a', '/Users/matt/project-b']),
      );
    });

    test('should show recent paths in the popover', async () => {
      const user = userEvent.setup();
      const component = renderComponent();

      await user.click(
        component.getByTestId('workflow-run-workspace-recent-trigger'),
      );

      expect(component.getByText('/Users/matt/project-a')).toBeInTheDocument();
      expect(component.getByText('/Users/matt/project-b')).toBeInTheDocument();
    });

    test('should populate the input when a recent path is selected', async () => {
      const user = userEvent.setup();
      const component = renderComponent();

      await user.click(
        component.getByTestId('workflow-run-workspace-recent-trigger'),
      );
      await user.click(component.getByText('/Users/matt/project-a'));

      expect(onChange).toHaveBeenCalledWith('/Users/matt/project-a');
    });
  });

  describe('when no recent paths exist', () => {
    test('should show empty message in the popover', async () => {
      const user = userEvent.setup();
      const component = renderComponent();

      await user.click(
        component.getByTestId('workflow-run-workspace-recent-trigger'),
      );

      expect(
        component.getByText('No recent workspace paths'),
      ).toBeInTheDocument();
    });
  });
});
