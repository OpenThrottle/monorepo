import * as React from 'react';
import { waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ScheduleRunNowButton } from '../ScheduleRunNowButton';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

interface ToastOptions {
  readonly action?: ToastAction;
}

// The component reaches for the shared `toast` proxy, so spy on it rather than
// mounting a Toaster — the assertions are about what gets announced, not paint.
const toastMock = vi.hoisted(() => {
  const fn = vi.fn();
  return Object.assign(fn, {
    dismiss: vi.fn(),
    error: vi.fn<(message: string) => void>(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
    success: vi.fn<(message: string, options?: ToastOptions) => void>(),
    warning: vi.fn(),
  });
});

vi.mock('@openthrottle/react-router-shadcn', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-shadcn')>();
  return { ...actual, toast: toastMock };
});

const JOB_ID = 'job-1';
const RUN_ID = 'run-9';

/** Mounts the button on `/schedule/:jobId` alongside the run-detail route it links to. */
const renderButton = (
  actionResult: Record<string, unknown>,
): { intents: (FormDataEntryValue | null)[]; view: RenderResult } => {
  const intents: (FormDataEntryValue | null)[] = [];

  const view = renderWithMemoryRouter(
    [
      {
        action: async ({
          request,
        }: {
          request: Request;
        }): Promise<Record<string, unknown>> => {
          const formData = await request.formData();
          intents.push(formData.get('intent'));
          return actionResult;
        },
        element: <ScheduleRunNowButton jobId={JOB_ID} />,
        // A loader makes the post-success revalidation re-render the tree, which is
        // exactly the condition that would re-fire an unguarded toast effect.
        loader: (): null => null,
        path: '/schedule/:jobId',
      },
      {
        element: <div data-testid="RunDetail">run detail</div>,
        path: '/schedule/:jobId/runs/:runId',
      },
    ],
    { initialEntries: [`/schedule/${JOB_ID}`] },
  );

  return { intents, view };
};

describe('ScheduleRunNowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('submits the run-now intent and toasts the queued run', async () => {
    const user = userEvent.setup();
    const { intents, view } = renderButton({ ok: true, runId: RUN_ID });

    await user.click(
      await view.findByRole('button', { name: SCHEDULE_COPY.runNowAction }),
    );

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledTimes(1);
    });

    expect(intents).toEqual(['run-now']);
    expect(toastMock.success).toHaveBeenCalledWith(
      SCHEDULE_COPY.runNowQueued,
      expect.objectContaining({
        action: expect.objectContaining({
          label: SCHEDULE_COPY.runNowViewRun,
        }),
      }),
    );
  });

  test('the View run action navigates to the run detail route', async () => {
    const user = userEvent.setup();
    const { view } = renderButton({ ok: true, runId: RUN_ID });

    await user.click(
      await view.findByRole('button', { name: SCHEDULE_COPY.runNowAction }),
    );
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledTimes(1);
    });

    const options = toastMock.success.mock.calls[0][1];

    expect(options?.action).toBeDefined();
    options?.action?.onClick();

    await waitFor(() => {
      expect(view.getByTestId('RunDetail')).toBeInTheDocument();
    });
  });

  test('does not re-toast the same run after a revalidation re-render', async () => {
    const user = userEvent.setup();
    const { view } = renderButton({ ok: true, runId: RUN_ID });

    await user.click(
      await view.findByRole('button', { name: SCHEDULE_COPY.runNowAction }),
    );
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledTimes(1);
    });

    // The success path revalidates, so the tree re-renders with the same
    // `fetcher.data`; the ref guard must keep that from announcing twice.
    await waitFor(() => {
      expect(
        view.getByRole('button', { name: SCHEDULE_COPY.runNowAction }),
      ).toBeEnabled();
    });

    expect(toastMock.success).toHaveBeenCalledTimes(1);
  });

  test('toasts an error when the action fails', async () => {
    const user = userEvent.setup();
    const { view } = renderButton({ error: 'Queue is offline.' });

    await user.click(
      await view.findByRole('button', { name: SCHEDULE_COPY.runNowAction }),
    );

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Queue is offline.');
    });
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});
