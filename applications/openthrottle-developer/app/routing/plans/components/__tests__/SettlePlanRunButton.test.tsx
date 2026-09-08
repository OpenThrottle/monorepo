import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettlePlanRunButton } from '../SettlePlanRunButton';
import type { PlanDetailForceSettlePlanRunMutation } from '~/__generated__/graphql';

type ForceSettlePayload =
  PlanDetailForceSettlePlanRunMutation['forceSettlePlanRun'];

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

const settledPayload: ForceSettlePayload = {
  __typename: 'PlanRunObject',
  heartbeatExpected: false,
  id: 'run-1',
  isStale: false,
  status: 'STALE',
};

interface RenderOptions {
  readonly action?: (formData: FormData) => Promise<unknown>;
}

const renderButton = (options: RenderOptions = {}): RenderResult => {
  const Component = () => (
    <SettlePlanRunButton planId="p1" planRunId="run-1" planTitle="Alpha" />
  );
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        const fd = await request.formData();
        return options.action ? options.action(fd) : null;
      },
      path: '/plans/:planId',
    },
  ]);
  return render(<RoutesStub initialEntries={['/plans/p1']} />);
};

describe('SettlePlanRunButton', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    toastError.mockClear();
    toastInfo.mockClear();
  });

  test('exposes aria-label and title on the trigger', () => {
    const component = renderButton();

    const trigger = component.getByRole('button', {
      name: /Settle interactive run for Alpha/i,
    });
    expect(trigger).toHaveAttribute(
      'aria-label',
      'Settle interactive run for Alpha',
    );
    expect(trigger).toHaveAttribute(
      'title',
      'Close the books on an interactive run that has lost contact: it cannot be verified or stopped, and until it is settled its worktree stays held.',
    );
    expect(trigger).toHaveTextContent('Settle run');
  });

  test('opens the dialog with the lost-contact copy', async () => {
    const user = userEvent.setup();
    const component = renderButton();

    await user.click(
      component.getByRole('button', {
        name: /Settle interactive run for Alpha/i,
      }),
    );

    expect(
      component.getByRole('heading', {
        name: /Settle this interactive run\?/i,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        /The newest run for "Alpha" was started from an interactive agent session, so it sends no heartbeat/i,
      ),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        /Until it is settled, its worktree stays marked busy/i,
      ),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        /records the run as STALE — contact lost — not completed and not cancelled/i,
      ),
    ).toBeInTheDocument();
    expect(
      component.getByText(/Plan and task status are left exactly as they are/i),
    ).toBeInTheDocument();
  });

  test('confirm posts intent=forceSettlePlanRun with the planRunId and toasts success', async () => {
    const user = userEvent.setup();
    const posts: Array<{ intent: unknown; planRunId: unknown }> = [];
    const component = renderButton({
      action: async (fd) => {
        posts.push({
          intent: fd.get('intent'),
          planRunId: fd.get('planRunId'),
        });
        return { forceSettlePlanRun: settledPayload };
      },
    });

    await user.click(
      component.getByRole('button', {
        name: /Settle interactive run for Alpha/i,
      }),
    );
    await user.click(component.getByRole('button', { name: /^Settle run$/i }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'Run recorded as STALE — contact lost. Its worktree is released; plan and task status are unchanged.',
      );
    });
    expect(posts).toEqual([
      { intent: 'forceSettlePlanRun', planRunId: 'run-1' },
    ]);
    expect(toastError).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        component.queryByRole('heading', {
          name: /Settle this interactive run\?/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  test('Escape closes the dialog without posting', async () => {
    const user = userEvent.setup();
    let posts = 0;
    const component = renderButton({
      action: async () => {
        posts += 1;
        return { forceSettlePlanRun: null };
      },
    });

    await user.click(
      component.getByRole('button', {
        name: /Settle interactive run for Alpha/i,
      }),
    );
    expect(
      component.getByRole('heading', {
        name: /Settle this interactive run\?/i,
      }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        component.queryByRole('heading', {
          name: /Settle this interactive run\?/i,
        }),
      ).not.toBeInTheDocument();
    });
    expect(posts).toBe(0);
  });

  test('Keep waiting closes the dialog without posting', async () => {
    const user = userEvent.setup();
    let posts = 0;
    const component = renderButton({
      action: async () => {
        posts += 1;
        return { forceSettlePlanRun: null };
      },
    });

    await user.click(
      component.getByRole('button', {
        name: /Settle interactive run for Alpha/i,
      }),
    );
    await user.click(
      component.getByRole('button', { name: /^Keep waiting$/i }),
    );

    await waitFor(() => {
      expect(
        component.queryByRole('heading', {
          name: /Settle this interactive run\?/i,
        }),
      ).not.toBeInTheDocument();
    });
    expect(posts).toBe(0);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  test('does not submit twice while the first request is in flight', async () => {
    const user = userEvent.setup();
    let posts = 0;
    let release: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const component = renderButton({
      action: async () => {
        posts += 1;
        await barrier;
        return { forceSettlePlanRun: settledPayload };
      },
    });

    await user.click(
      component.getByRole('button', {
        name: /Settle interactive run for Alpha/i,
      }),
    );
    await user.click(component.getByRole('button', { name: /^Settle run$/i }));

    await waitFor(() => {
      expect(posts).toBe(1);
    });

    // Trigger sits under aria-hidden while the dialog is open; still assert label + text.
    expect(
      component.getByRole('button', {
        hidden: true,
        name: /Settle interactive run for Alpha/i,
      }),
    ).toHaveTextContent('Settling…');
    const settlingConfirm = component.getByRole('button', {
      name: /^Settling…$/i,
    });
    expect(settlingConfirm).toBeDisabled();
    await user.click(settlingConfirm);
    expect(posts).toBe(1);

    release?.();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
    expect(posts).toBe(1);
  });

  test('shows an error toast and keeps the dialog open on forceSettlePlanRunError', async () => {
    const user = userEvent.setup();
    const component = renderButton({
      action: async () => ({
        forceSettlePlanRunError:
          'Nothing to settle — this run is no longer an unsettled interactive run.',
      }),
    });

    await user.click(
      component.getByRole('button', {
        name: /Settle interactive run for Alpha/i,
      }),
    );
    await user.click(component.getByRole('button', { name: /^Settle run$/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Nothing to settle — this run is no longer an unsettled interactive run.',
      );
    });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(
      component.getByRole('heading', {
        name: /Settle this interactive run\?/i,
      }),
    ).toBeInTheDocument();
  });
});
