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

  test('renders worktree fieldset and default omit mode', () => {
    const Component = () => <PlanWorkflowConfigWorktree {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    expect(getByLabelText('--worktree')).toBeInTheDocument();
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
