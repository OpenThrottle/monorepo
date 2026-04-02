import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { KillPlanRunButton } from '../KillPlanRunButton';
import type { PlanDetailCancelPlanRunMutation } from '~/__generated__/graphql';

type CancelPlanRunPayload = PlanDetailCancelPlanRunMutation['cancelPlanRun'];

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: toastError,
    success: toastSuccess,
  }),
}));

describe('KillPlanRunButton', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  test('renders nothing when show is false', () => {
    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="T" show={false} />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/plans/:planId' },
    ]);
    render(<RoutesStub initialEntries={['/plans/p1']} />);

    expect(
      screen.queryByRole('button', { name: /Kill plan run for T/i }),
    ).not.toBeInTheDocument();
  });

  test('shows Kill run trigger when show is true', () => {
    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/plans/:planId' },
    ]);
    render(<RoutesStub initialEntries={['/plans/p1']} />);

    expect(
      screen.getByRole('button', { name: /Kill plan run for Alpha/i }),
    ).toBeInTheDocument();
  });

  test('opens dialog with copy and submits cancelPlanRun to route action', async () => {
    const user = userEvent.setup();
    const cancelPayload: CancelPlanRunPayload = {
      __typename: 'CancelPlanRunResultObject',
      activeJobIdsCouldNotCancel: [],
      noMatchingJob: true,
      planId: 'p1',
      planStatusAfter: null,
      removedJobIds: [],
      signaledActiveRunToStop: false,
    };

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const fd = await request.formData();
          if (fd.get('intent') === 'cancelPlanRun') {
            return { cancelPlanRun: cancelPayload };
          }
          return null;
        },
        path: '/plans/:planId',
      },
    ]);

    render(<RoutesStub initialEntries={['/plans/p1']} />);

    await user.click(
      screen.getByRole('button', { name: /Kill plan run for Alpha/i }),
    );
    expect(
      screen.getByRole('heading', { name: /Kill plan run/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Kill run$/i }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'No queued or active plan run was found for this plan.',
      );
    });
    expect(toastError).not.toHaveBeenCalled();
  });
});
