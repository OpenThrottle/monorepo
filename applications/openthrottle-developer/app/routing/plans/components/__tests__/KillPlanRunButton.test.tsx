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

  test('exposes aria-label and title on trigger for assistive tech and hover', () => {
    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/plans/:planId' },
    ]);
    render(<RoutesStub initialEntries={['/plans/p1']} />);

    const trigger = screen.getByRole('button', {
      name: /Kill plan run for Alpha/i,
    });
    expect(trigger).toHaveAttribute('aria-label', 'Kill plan run for Alpha');
    expect(trigger).toHaveAttribute(
      'title',
      'Cancel the queued worker job or signal an active Ralph run to stop for this plan.',
    );
  });

  test('Escape closes dialog without posting cancelPlanRun', async () => {
    const user = userEvent.setup();
    let cancelPlanRunPosts = 0;

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const fd = await request.formData();
          if (fd.get('intent') === 'cancelPlanRun') {
            cancelPlanRunPosts += 1;
            return { cancelPlanRun: null };
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
      screen.getByRole('heading', { name: /Kill plan run\?/i }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Kill plan run\?/i }),
      ).not.toBeInTheDocument();
    });
    expect(cancelPlanRunPosts).toBe(0);
  });

  test('focus returns to Kill run trigger after Escape closes dialog', async () => {
    const user = userEvent.setup();

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/plans/:planId' },
    ]);

    render(<RoutesStub initialEntries={['/plans/p1']} />);

    const trigger = screen.getByRole('button', {
      name: /Kill plan run for Alpha/i,
    });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
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

  test('Cancel closes dialog without posting cancelPlanRun', async () => {
    const user = userEvent.setup();
    let cancelPlanRunPosts = 0;

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const fd = await request.formData();
          if (fd.get('intent') === 'cancelPlanRun') {
            cancelPlanRunPosts += 1;
            return { cancelPlanRun: null };
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
      screen.getByRole('heading', { name: /Kill plan run\?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Task or plan edits are not deleted/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Kill plan run\?/i }),
      ).not.toBeInTheDocument();
    });
    expect(cancelPlanRunPosts).toBe(0);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  test('shows Stopping… on trigger and confirm while cancel request is in flight', async () => {
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

    let releaseCancel: (() => void) | undefined;
    const cancelBarrier = new Promise<void>((resolve) => {
      releaseCancel = resolve;
    });

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const fd = await request.formData();
          if (fd.get('intent') === 'cancelPlanRun') {
            await cancelBarrier;
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
    await user.click(screen.getByRole('button', { name: /^Kill run$/i }));

    // Trigger sits under aria-hidden while the dialog is open; still assert label + text.
    expect(
      screen.getByRole('button', {
        hidden: true,
        name: /Kill plan run for Alpha/i,
      }),
    ).toHaveTextContent('Stopping…');
    expect(
      screen.getByRole('button', { name: /^Stopping…$/i }),
    ).toBeInTheDocument();

    releaseCancel?.();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
  });

  test('shows error toast when action returns cancelPlanRunError (API/network failure)', async () => {
    const user = userEvent.setup();

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const fd = await request.formData();
          if (fd.get('intent') === 'cancelPlanRun') {
            return { cancelPlanRunError: 'Failed to fetch' };
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
    await user.click(screen.getByRole('button', { name: /^Kill run$/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Failed to fetch');
    });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: /Kill plan run\?/i }),
    ).toBeInTheDocument();
  });

  test('does not submit cancelPlanRun twice while the first request is in flight', async () => {
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

    let cancelPlanRunPosts = 0;
    let releaseCancel: (() => void) | undefined;
    const cancelBarrier = new Promise<void>((resolve) => {
      releaseCancel = resolve;
    });

    const Component = () => (
      <KillPlanRunButton planId="p1" planTitle="Alpha" show={true} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const fd = await request.formData();
          if (fd.get('intent') === 'cancelPlanRun') {
            cancelPlanRunPosts += 1;
            await cancelBarrier;
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
    const confirmKill = screen.getByRole('button', { name: /^Kill run$/i });
    await user.click(confirmKill);

    await waitFor(() => {
      expect(cancelPlanRunPosts).toBe(1);
    });

    const stoppingConfirm = screen.getByRole('button', {
      name: /^Stopping…$/i,
    });
    expect(stoppingConfirm).toBeDisabled();
    await user.click(stoppingConfirm);
    expect(cancelPlanRunPosts).toBe(1);

    releaseCancel?.();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
    expect(cancelPlanRunPosts).toBe(1);
  });
});
