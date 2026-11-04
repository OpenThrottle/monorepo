import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_CANCEL_SCHEDULED_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunCancelScheduledDialog } from '../PlanRunCancelScheduledDialog';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  }),
}));

const COPY = PLAN_RUN_CANCEL_SCHEDULED_COPY;

describe('PlanRunCancelScheduledDialog Component', () => {
  test('opens from the open prop alone, with no trigger, and renders the confirm copy', async () => {
    const Component = () => (
      <PlanRunCancelScheduledDialog
        onOpenChange={vi.fn()}
        open={true}
        planId="plan-1"
        planRunId="run-9"
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      await component.findByRole('heading', { name: COPY.dialogTitle }),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('button', { name: COPY.ariaLabel }),
    ).toBeNull();
  });

  test('posts planRunId on confirm and asks to close once the cancel settles', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const submissions: FormData[] = [];
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <PlanRunCancelScheduledDialog
        onOpenChange={onOpenChange}
        open={true}
        planId="plan-1"
        planRunId="run-9"
      />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      {
        Component: () => null,
        action: async ({ request }) => {
          submissions.push(await request.formData());

          return {
            cancelPlanRun: { outcome: 'RUN_CANCELLED', removedJobIds: [] },
          };
        },
        path: '/plans/:planId',
      },
    ]);
    const component = render(<RoutesStub />);

    await user.click(
      await component.findByRole('button', { name: COPY.confirmLabel }),
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(submissions[0]?.get('intent')).toBe('cancelPlanRun');
    expect(submissions[0]?.get('planRunId')).toBe('run-9');
  });
});
