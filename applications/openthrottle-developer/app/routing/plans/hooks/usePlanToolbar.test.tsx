import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getRecentWorkspacePaths } from '~/routing/plans/utils/workspace-path';
import {
  usePlanToolbar,
  type UsePlanToolbarOptions,
  type UsePlanToolbarResult,
} from './usePlanToolbar';

vi.mock('@openthrottle/react-router-shadcn', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const successMock = vi.mocked(toast.success);
const errorMock = vi.mocked(toast.error);

interface HarnessProps {
  readonly onRender: (result: UsePlanToolbarResult) => void;
  readonly options: UsePlanToolbarOptions;
}

function Harness({ onRender, options }: HarnessProps): React.ReactElement {
  const toolbar = usePlanToolbar(options);

  React.useEffect(() => {
    onRender(toolbar);
  });

  return (
    <div>
      <button
        data-testid="run-plan"
        onClick={() =>
          toolbar.fetcherRunPlan.submit(
            { intent: 'runPlan' },
            { method: 'post' },
          )
        }
        type="button"
      >
        Run
      </button>
      <button
        data-testid="mark-complete"
        onClick={() =>
          toolbar.fetcherSetPlanStatus.submit(
            { intent: 'setPlanStatus' },
            { method: 'post' },
          )
        }
        type="button"
      >
        Mark complete
      </button>
      <button
        data-testid="evaluate-rules"
        onClick={() =>
          toolbar.fetcherEvaluateRules.submit(
            { intent: 'evaluatePlanRules' },
            { method: 'post' },
          )
        }
        type="button"
      >
        Evaluate rules
      </button>
    </div>
  );
}

function renderPlanToolbar(
  options: UsePlanToolbarOptions,
  action: (args: { request: Request }) => Promise<unknown> | unknown,
): {
  readonly getByTestId: (testId: string) => HTMLElement;
  readonly latest: { current: UsePlanToolbarResult | null };
} {
  const latest: { current: UsePlanToolbarResult | null } = { current: null };

  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- inline route component composing the module-level Harness
      Component: (): React.ReactElement => (
        <Harness
          onRender={(result) => {
            latest.current = result;
          }}
          options={options}
        />
      ),
      action,
      path: '/',
    },
  ]);

  const view = render(<Stub initialEntries={['/']} />);
  return { getByTestId: view.getByTestId, latest };
}

describe('usePlanToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  test('derives isRunning/isTerminal/isCompleted from planStatus', () => {
    const { latest } = renderPlanToolbar({ planStatus: 'QUEUED' }, () => ({}));

    expect(latest.current?.isRunning).toBe(true);
    expect(latest.current?.isTerminal).toBe(false);
    expect(latest.current?.isCompleted).toBe(false);
  });

  test('COMPLETED status reports isCompleted and isTerminal, not isRunning', () => {
    const { latest } = renderPlanToolbar(
      { planStatus: 'COMPLETED' },
      () => ({}),
    );

    expect(latest.current?.isCompleted).toBe(true);
    expect(latest.current?.isTerminal).toBe(true);
    expect(latest.current?.isRunning).toBe(false);
  });

  test('a queued run success toast includes the job id and records the workspace path', async () => {
    const { getByTestId } = renderPlanToolbar(
      { planStatus: 'DRAFT', workingDirectory: '/repo/checkout' },
      () => ({ runPlan: { jobId: 'job-123' } }),
    );

    const user = userEvent.setup();
    await user.click(getByTestId('run-plan'));

    await waitFor(() => {
      expect(successMock).toHaveBeenCalled();
    });
    expect(successMock.mock.calls[0]?.[0]).toBe('Plan run queued');
    expect(getRecentWorkspacePaths()).toContain('/repo/checkout');
  });

  test('a run error surfaces via the error toast instead of the queued-success toast', async () => {
    const { getByTestId } = renderPlanToolbar({ planStatus: 'DRAFT' }, () => ({
      runPlanError: 'Something went wrong',
    }));

    const user = userEvent.setup();
    await user.click(getByTestId('run-plan'));

    await waitFor(() => {
      expect(errorMock).toHaveBeenCalledWith(
        'Something went wrong',
        expect.objectContaining({ id: 'run-plan' }),
      );
    });
    expect(successMock).not.toHaveBeenCalled();
  });

  test('marking complete shows the "Plan marked complete." toast on success', async () => {
    const { getByTestId } = renderPlanToolbar(
      { planStatus: 'IN_PROGRESS' },
      () => ({ setPlanStatus: { status: 'COMPLETED' } }),
    );

    const user = userEvent.setup();
    await user.click(getByTestId('mark-complete'));

    await waitFor(() => {
      expect(successMock).toHaveBeenCalledWith(
        'Plan marked complete.',
        expect.objectContaining({ id: 'set-plan-status' }),
      );
    });
  });

  test('evaluating rules shows the queued-rules-evaluation toast on success', async () => {
    const { getByTestId } = renderPlanToolbar({ planStatus: 'DRAFT' }, () => ({
      evaluatePlanRules: { queued: true },
    }));

    const user = userEvent.setup();
    await user.click(getByTestId('evaluate-rules'));

    await waitFor(() => {
      expect(successMock).toHaveBeenCalledWith(
        'Rules evaluation queued',
        expect.objectContaining({ id: 'evaluate-plan-rules' }),
      );
    });
  });
});
