import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_CONFIG_WORKTREE_CLEANUP_COPY } from '~/routing/plans/data/data.copy';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

import type { PlanWorkflowConfigWorktreeCleanupProps } from '../PlanWorkflowConfigWorktreeCleanup';
import { PlanWorkflowConfigWorktreeCleanup } from '../PlanWorkflowConfigWorktreeCleanup';

const renderCleanup = (
  props: PlanWorkflowConfigWorktreeCleanupProps,
): ReturnType<typeof render> => {
  const Component = () => {
    return <PlanWorkflowConfigWorktreeCleanup {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('PlanWorkflowConfigWorktreeCleanup Component', () => {
  let setInput: ReturnType<
    typeof vi.fn<PlanWorkflowConfigWorktreeCleanupProps['setInput']>
  >;

  beforeEach(() => {
    setInput = vi.fn<PlanWorkflowConfigWorktreeCleanupProps['setInput']>();
  });

  describe('when the worktree is on', () => {
    test('defaults to removing the worktree once the run opens a PR', () => {
      const component = renderCleanup({
        input: getDefaultWorkflowRalphRunOptionsInput(),
        setInput,
      });

      const select = component.getByRole('combobox', {
        name: PLAN_CONFIG_WORKTREE_CLEANUP_COPY.label,
      });

      expect(select).toBeEnabled();
      expect(select).toHaveTextContent(
        PLAN_CONFIG_WORKTREE_CLEANUP_COPY.onPrLabel,
      );
    });

    test('records a keep choice', async () => {
      const user = userEvent.setup();
      const input = getDefaultWorkflowRalphRunOptionsInput();
      const component = renderCleanup({ input, setInput });

      await user.click(
        component.getByRole('combobox', {
          name: PLAN_CONFIG_WORKTREE_CLEANUP_COPY.label,
        }),
      );
      await user.click(
        component.getByRole('option', {
          name: PLAN_CONFIG_WORKTREE_CLEANUP_COPY.keepLabel,
        }),
      );

      expect(setInput).toHaveBeenCalledTimes(1);
      const updater = setInput.mock.calls[0]?.[0];
      if (typeof updater !== 'function') throw new Error('expected updater');
      const next: WorkflowRalphRunOptionsInput = updater(input);
      expect(next.worktreeCleanup).toBe('keep');
    });
  });

  describe('when the worktree is off', () => {
    test('disables the control and says why', () => {
      const component = renderCleanup({
        input: {
          ...getDefaultWorkflowRalphRunOptionsInput(),
          worktreeCli: 'omit',
        },
        setInput,
      });

      expect(
        component.getByRole('combobox', {
          name: PLAN_CONFIG_WORKTREE_CLEANUP_COPY.label,
        }),
      ).toBeDisabled();
      expect(
        component.getByText(PLAN_CONFIG_WORKTREE_CLEANUP_COPY.disabledHint),
      ).toBeInTheDocument();
    });
  });
});
