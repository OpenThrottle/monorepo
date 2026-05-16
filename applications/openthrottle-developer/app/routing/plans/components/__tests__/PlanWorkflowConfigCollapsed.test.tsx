import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfigCollapsed } from '../PlanWorkflowConfigCollapsed';

describe('PlanWorkflowConfigCollapsed Component', () => {
  test('renders collapsed workflow card and expand control', () => {
    const onClick = vi.fn();
    const Component = () => <PlanWorkflowConfigCollapsed onClick={onClick} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId, getByRole } = render(<RoutesStub />);

    expect(getByTestId('workflow-run-options-collapsed')).toBeInTheDocument();
    expect(
      getByRole('heading', { name: 'Workflow Configuration' }),
    ).toBeInTheDocument();
    expect(getByTestId('workflow-run-options-expand')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('calls onClick when expand is activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const Component = () => <PlanWorkflowConfigCollapsed onClick={onClick} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    await user.click(getByTestId('workflow-run-options-expand'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
