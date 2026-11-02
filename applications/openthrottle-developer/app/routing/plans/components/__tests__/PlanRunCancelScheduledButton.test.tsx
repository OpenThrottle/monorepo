import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_CANCEL_SCHEDULED_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunCancelScheduledButton } from '../PlanRunCancelScheduledButton';

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

const COPY = PLAN_RUN_CANCEL_SCHEDULED_COPY;

type ActionResult = Record<string, unknown>;

const renderButton = (respond: (form: FormData) => ActionResult) => {
  const submissions: FormData[] = [];
  const loader = vi.fn(() => null);
  const Component = () => (
    <PlanRunCancelScheduledButton planId="plan-1" planRunId="run-9" />
  );
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        const form = await request.formData();
        submissions.push(form);
        return respond(form);
      },
      loader,
      path: '/plans/:planId',
    },
  ]);

  return {
    component: render(<RoutesStub initialEntries={['/plans/plan-1']} />),
    loader,
    submissions,
  };
};

describe('PlanRunCancelScheduledButton Component', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastInfo.mockClear();
    toastSuccess.mockClear();
  });

  test('asks for confirmation before posting anything', async () => {
    const user = userEvent.setup();
    const { component, submissions } = renderButton(() => ({}));

    await user.click(
      await component.findByRole('button', { name: COPY.ariaLabel }),
    );

    expect(
      component.getByRole('heading', { name: COPY.dialogTitle }),
    ).toBeInTheDocument();
    await user.click(component.getByRole('button', { name: COPY.keepLabel }));
    expect(submissions).toHaveLength(0);
  });

  test('submits intent=cancelPlanRun with the planRunId, toasts success and revalidates', async () => {
    const user = userEvent.setup();
    const { component, loader, submissions } = renderButton(() => ({
      cancelPlanRun: { outcome: 'RUN_CANCELLED', removedJobIds: ['job-1'] },
    }));

    await user.click(
      await component.findByRole('button', { name: COPY.ariaLabel }),
    );
    await user.click(
      component.getByRole('button', { name: COPY.confirmLabel }),
    );

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledTimes(1);
    });
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.get('intent')).toBe('cancelPlanRun');
    expect(submissions[0]?.get('planRunId')).toBe('run-9');
    expect(toastSuccess.mock.calls[0]?.[0]).toMatch(/Run cancelled/);
    // The loader runs again after the action so `Plan.scheduledRunAt` clears.
    await waitFor(() => {
      expect(loader.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('surfaces an already-settled run (NO_ACTIVE_RUN) as info, not success', async () => {
    const user = userEvent.setup();
    const { component } = renderButton(() => ({
      cancelPlanRun: { outcome: 'NO_ACTIVE_RUN', removedJobIds: [] },
    }));

    await user.click(
      await component.findByRole('button', { name: COPY.ariaLabel }),
    );
    await user.click(
      component.getByRole('button', { name: COPY.confirmLabel }),
    );

    await waitFor(() => {
      expect(toastInfo).toHaveBeenCalledTimes(1);
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  test('shows the server error from cancelPlanRunError', async () => {
    const user = userEvent.setup();
    const { component } = renderButton(() => ({
      cancelPlanRunError: 'Failed to cancel plan run.',
    }));

    await user.click(
      await component.findByRole('button', { name: COPY.ariaLabel }),
    );
    await user.click(
      component.getByRole('button', { name: COPY.confirmLabel }),
    );

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Failed to cancel plan run.');
    });
  });
});
