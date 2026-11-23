import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getDefaultPlanRunOptions } from '~/routing/plans/utils/plan-run-options';

import type { PlanWorkflowConfigWorktreeProps } from '../PlanWorkflowConfigWorktree';
import { PlanWorkflowConfigWorktree } from '../PlanWorkflowConfigWorktree';

describe('PlanWorkflowConfigWorktree Component', () => {
  let props: PlanWorkflowConfigWorktreeProps;

  beforeEach(() => {
    props = {
      heading: '06. Worktree',
      input: getDefaultPlanRunOptions(),
      setInput: vi.fn(),
    };
  });

  test('renders the worktree fieldset with its name field', () => {
    const Component = () => {
      return <PlanWorkflowConfigWorktree {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    // Every run gets a worktree, so the name field is present without any interaction.
    expect(component.getByLabelText('Worktree name')).toBeInTheDocument();
  });

  test('offers the derived name for a blank worktree name', () => {
    props = {
      heading: '06. Worktree',
      input: getDefaultPlanRunOptions({
        planId: '5e172b67-a543-4902-8fdf-fb3a38e005b2',
      }),
      setInput: vi.fn(),
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return <PlanWorkflowConfigWorktree {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    const nameField = component.getByLabelText('Worktree name');

    expect(nameField).toHaveValue('');
    expect(nameField).toHaveAttribute('placeholder', 'plan-5e172b67');
    expect(component.getByText(/plan-5e172b67/)).toBeInTheDocument();
  });

  test('lets the worktree name be overridden', async () => {
    const user = userEvent.setup();
    const setInput = vi.fn();
    props = {
      heading: '06. Worktree',
      input: getDefaultPlanRunOptions(),
      setInput,
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return <PlanWorkflowConfigWorktree {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    expect(getByLabelText('Worktree name')).toBeInTheDocument();

    await user.type(getByLabelText('Worktree name'), 'target-one');

    expect(setInput).toHaveBeenCalled();
  });
});
