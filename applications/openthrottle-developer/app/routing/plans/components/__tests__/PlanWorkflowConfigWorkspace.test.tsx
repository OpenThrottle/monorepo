import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { PlanWorkflowConfigWorkspace } from '../PlanWorkflowConfigWorkspace';
import type { PlanWorkflowConfigWorkspaceProps } from '../PlanWorkflowConfigWorkspace';
import { RECENT_WORKSPACE_PATHS_STORAGE_KEY } from '~/routing/plans/config/defaults';

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

    const Component = () => <PlanWorkflowConfigWorkspace {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  test('should render with empty value', () => {
    renderComponent();

    expect(
      screen.getByRole('group', { name: '02. Workspace' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('');
  });

  test('should render with a provided value', () => {
    renderComponent({ value: '/Users/matt/Development/my-project' });

    expect(
      screen.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('/Users/matt/Development/my-project');
  });

  test('should call onChange when the user types a path', async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByLabelText('Absolute path to workspace directory');
    await user.type(input, '/');

    expect(onChange).toHaveBeenCalledWith('/');
  });

  test('should show validation error for relative paths', () => {
    renderComponent({ value: 'relative/path' });

    expect(
      screen.getByText('Path must be absolute (start with /)'),
    ).toBeInTheDocument();
  });

  test('should show clear button when value is non-empty', () => {
    renderComponent({ value: '/some/path' });

    expect(screen.getByLabelText('Clear workspace path')).toBeInTheDocument();
  });

  test('should not show clear button when value is empty', () => {
    renderComponent({ value: '' });

    expect(
      screen.queryByLabelText('Clear workspace path'),
    ).not.toBeInTheDocument();
  });

  test('should call onChange with empty string when clear is clicked', async () => {
    const user = userEvent.setup();
    renderComponent({ value: '/some/path' });

    await user.click(screen.getByLabelText('Clear workspace path'));

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
      renderComponent();

      await user.click(
        screen.getByTestId('workflow-run-workspace-recent-trigger'),
      );

      expect(screen.getByText('/Users/matt/project-a')).toBeInTheDocument();
      expect(screen.getByText('/Users/matt/project-b')).toBeInTheDocument();
    });

    test('should populate the input when a recent path is selected', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(
        screen.getByTestId('workflow-run-workspace-recent-trigger'),
      );
      await user.click(screen.getByText('/Users/matt/project-a'));

      expect(onChange).toHaveBeenCalledWith('/Users/matt/project-a');
    });
  });

  describe('when no recent paths exist', () => {
    test('should show empty message in the popover', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(
        screen.getByTestId('workflow-run-workspace-recent-trigger'),
      );

      expect(screen.getByText('No recent workspace paths')).toBeInTheDocument();
    });
  });
});
