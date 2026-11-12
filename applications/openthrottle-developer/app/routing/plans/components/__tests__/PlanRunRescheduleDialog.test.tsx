import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_RESCHEDULE_COPY } from '~/routing/plans/data/data.copy';

import type { PlanRunRescheduleDialogProps } from '../PlanRunRescheduleDialog';
import { PlanRunRescheduleDialog } from '../PlanRunRescheduleDialog';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: toastError,
    info: vi.fn(),
    success: toastSuccess,
  }),
}));

const COPY = PLAN_RUN_RESCHEDULE_COPY;

const NOW = new Date('2026-11-02T20:00:00.000Z');

// A whole-hour instant three days out: in range, and survives the picker's minute precision.
const futureInstant = (): Date => {
  return new Date('2026-11-05T20:00:00.000Z');
};

const renderDialog = (
  overrides: Partial<PlanRunRescheduleDialogProps>,
  respond: (form: FormData) => Record<string, unknown>,
) => {
  const submissions: FormData[] = [];
  const onOpenChange = vi.fn();
  const props: PlanRunRescheduleDialogProps = {
    onOpenChange,
    open: true,
    planId: 'plan-1',
    planRunId: 'run-9',
    scheduledFor: futureInstant().toISOString(),
    ...overrides,
  };
  const Component = () => {
    return <PlanRunRescheduleDialog {...props} />;
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        const form = await request.formData();
        submissions.push(form);
        return respond(form);
      },
      loader: () => null,
      path: '/plans/:planId',
    },
  ]);

  return {
    component: render(<RoutesStub initialEntries={['/plans/plan-1']} />),
    onOpenChange,
    submissions,
  };
};

describe('PlanRunRescheduleDialog Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when the run has a future fire time', () => {
    test('shows the title and the schedule picker without an error', async () => {
      const { component } = renderDialog({}, () => ({}));

      expect(
        await component.findByRole('heading', { name: COPY.dialogTitle }),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('PlanRunDialogSchedule'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('PlanRunDialogSchedule-error'),
      ).not.toBeInTheDocument();
      expect(
        component.getByRole('button', { name: COPY.submitLabel }),
      ).toBeEnabled();
    });

    test('posts intent, planRunId and the ISO instant, then toasts, closes and revalidates', async () => {
      const user = userEvent.setup();
      const scheduledFor = futureInstant().toISOString();
      const { component, onOpenChange, submissions } = renderDialog(
        { scheduledFor },
        () => ({
          reschedulePlanRun: {
            jobId: 'job-1',
            planId: 'plan-1',
            planRunId: 'run-9',
            scheduledFor,
          },
        }),
      );

      await user.click(
        await component.findByRole('button', { name: COPY.submitLabel }),
      );

      await waitFor(() => {
        expect(toastSuccess).toHaveBeenCalledTimes(1);
      });
      expect(submissions).toHaveLength(1);
      expect(submissions[0]?.get('intent')).toBe('reschedulePlanRun');
      expect(submissions[0]?.get('planRunId')).toBe('run-9');
      expect(submissions[0]?.get('scheduledFor')).toBe(scheduledFor);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('toasts the server error and stays open', async () => {
      const user = userEvent.setup();
      const { component, onOpenChange } = renderDialog({}, () => ({
        reschedulePlanRunError: 'Run is already starting.',
      }));

      await user.click(
        await component.findByRole('button', { name: COPY.submitLabel }),
      );

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith('Run is already starting.');
      });
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe('when the current fire time is in the past', () => {
    test('shows the client-side error and disables submit', async () => {
      const { component, submissions } = renderDialog(
        { scheduledFor: '2020-01-01T00:00:00.000Z' },
        () => ({}),
      );

      expect(
        await component.findByTestId('PlanRunDialogSchedule-error'),
      ).toBeInTheDocument();
      expect(
        component.getByRole('button', { name: COPY.submitLabel }),
      ).toBeDisabled();
      expect(submissions).toHaveLength(0);
    });
  });

  describe('when the fire time is unknown', () => {
    test('opens on a valid default instant', async () => {
      const { component } = renderDialog({ scheduledFor: null }, () => ({}));

      await component.findByRole('heading', { name: COPY.dialogTitle });
      expect(
        component.queryByTestId('PlanRunDialogSchedule-error'),
      ).not.toBeInTheDocument();
      expect(
        component.getByRole('button', { name: COPY.submitLabel }),
      ).toBeEnabled();
    });
  });

  describe('when Keep current time is clicked', () => {
    test('closes without posting', async () => {
      const user = userEvent.setup();
      const { component, onOpenChange, submissions } = renderDialog(
        {},
        () => ({}),
      );

      await user.click(
        await component.findByRole('button', { name: COPY.cancelLabel }),
      );

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(submissions).toHaveLength(0);
    });
  });
});
