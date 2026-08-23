import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfigWorktree } from '../PlanWorkflowConfigWorktree';
import type { PlanWorkflowConfigWorktreeProps } from '../PlanWorkflowConfigWorktree';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('PlanWorkflowConfigWorktree Component', () => {
  let props: PlanWorkflowConfigWorktreeProps;

  beforeEach(() => {
    props = {
      heading: '06. Worktree',
      input: getDefaultWorkflowRalphRunOptionsInput(),
      setInput: vi.fn(),
    };
  });

  test('renders the worktree fieldset, on by default', () => {
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByLabelText('Worktree')).toBeInTheDocument();
    // Default is a named worktree, so the name field is present without any interaction.
    expect(
      component.getByLabelText('Agent CLI worktree name for --worktree'),
    ).toBeInTheDocument();
  });

  test('offers the derived name for a blank worktree name', () => {
    props = {
      heading: '06. Worktree',
      input: getDefaultWorkflowRalphRunOptionsInput({
        planId: '5e172b67-a543-4902-8fdf-fb3a38e005b2',
      }),
      setInput: vi.fn(),
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    const nameField = component.getByLabelText(
      'Agent CLI worktree name for --worktree',
    );

    expect(nameField).toHaveValue('');
    expect(nameField).toHaveAttribute('placeholder', 'plan-5e172b67');
    expect(component.getByText(/plan-5e172b67/)).toBeInTheDocument();
  });

  test('warns that turning the worktree off works in the base checkout', () => {
    props = {
      heading: '06. Worktree',
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput({ planId: 'plan-1' }),
        worktreeCli: 'omit',
      },
      setInput: vi.fn(),
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByText(/works directly in the base checkout/),
    ).toBeInTheDocument();
    expect(
      component.queryByLabelText('Agent CLI worktree name for --worktree'),
    ).not.toBeInTheDocument();
  });

  test('shows worktree name input when mode is named', async () => {
    const user = userEvent.setup();
    const setInput = vi.fn();
    props = {
      heading: '06. Worktree',
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput(),
        worktreeCli: 'named',
      },
      setInput,
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    expect(
      getByLabelText('Agent CLI worktree name for --worktree'),
    ).toBeInTheDocument();

    await user.type(
      getByLabelText('Agent CLI worktree name for --worktree'),
      'target-one',
    );

    expect(setInput).toHaveBeenCalled();
  });

  test('shows cursor-only fields when backend is cursor', () => {
    props = {
      heading: '06. Worktree',
      input: getDefaultWorkflowRalphRunOptionsInput(),
      setInput: vi.fn(),
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    expect(
      getByLabelText('Base branch for cursor-agent --worktree-base'),
    ).toBeInTheDocument();
    expect(
      getByLabelText('Enable --skip-worktree-setup for cursor-agent'),
    ).toBeInTheDocument();
  });

  test('hides cursor-only fields when backend is claude', () => {
    props = {
      heading: '06. Worktree',
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput(),
        executionBackend: 'claude',
      },
      setInput: vi.fn(),
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { queryByLabelText } = render(<RoutesStub />);

    expect(
      queryByLabelText('Base branch for cursor-agent --worktree-base'),
    ).not.toBeInTheDocument();
    expect(
      queryByLabelText('Enable --skip-worktree-setup for cursor-agent'),
    ).not.toBeInTheDocument();
  });
});
