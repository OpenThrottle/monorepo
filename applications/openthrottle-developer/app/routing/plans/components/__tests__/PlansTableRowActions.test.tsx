import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanCardFragment } from '~/__generated__/graphql';
import { PLANS_ROW_ACTIONS_COPY } from '~/routing/plans/data/data.copy';

import { PlansTableRowActions } from '../PlansTableRowActions';

const { toastError, toastInfo, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: toastError,
    info: toastInfo,
    success: toastSuccess,
  }),
}));

const plan: PlanCardFragment = {
  __typename: 'PlanObject',
  assignee: null,
  author: 'author1',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  hasCustomRunConfig: false,
  id: 'plan-1',
  projectRelation: null,
  status: 'IN_PROGRESS',
  summary: null,
  tags: [],
  taskCount: 0,
  tasksCompletedCount: 0,
  title: 'First Plan',
  updatedAt: '2025-01-01T00:00:00Z',
};

const renderRowActions = (actionResult: unknown): RenderResult => {
  const Component = (): React.ReactElement => (
    <TooltipProvider>
      <PlansTableRowActions plan={plan} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/plans' },
    { action: () => actionResult, path: '/plans/:planId' },
  ]);

  return render(<RoutesStub initialEntries={['/plans']} />);
};

const confirmKill = async (component: RenderResult): Promise<void> => {
  const user = userEvent.setup();

  await user.click(
    component.getByRole('button', {
      name: `${PLANS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} First Plan`,
    }),
  );
  await user.click(
    component.getByRole('menuitem', {
      name: PLANS_ROW_ACTIONS_COPY.killConfirm,
    }),
  );
  await user.click(
    component.getByRole('button', { name: PLANS_ROW_ACTIONS_COPY.killConfirm }),
  );
};

describe('PlansTableRowActions cancel outcome', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastInfo.mockClear();
    toastSuccess.mockClear();
  });

  test('toasts success when a run was actually cancelled', async () => {
    const component = renderRowActions({
      cancelPlanRun: { outcome: 'RUN_CANCELLED', removedJobIds: ['job-1'] },
    });

    await confirmKill(component);

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'Run cancelled — removed 1 queued job from the queue.',
      );
    });
    expect(toastInfo).not.toHaveBeenCalled();
  });

  // A no-op must never read as a success — that is the failure mode this whole
  // plan exists to eliminate (a working Kill indistinguishable from a broken one).
  test('toasts info, not success, when there was no active run', async () => {
    const component = renderRowActions({
      cancelPlanRun: { outcome: 'NO_ACTIVE_RUN', removedJobIds: [] },
    });

    await confirmKill(component);

    await waitFor(() => {
      expect(toastInfo).toHaveBeenCalledWith(
        'No queued or active plan run was found to cancel.',
      );
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  test('toasts the error when the action returns one', async () => {
    const component = renderRowActions({ cancelPlanRunError: 'Nope.' });

    await confirmKill(component);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Nope.');
    });
  });
});
