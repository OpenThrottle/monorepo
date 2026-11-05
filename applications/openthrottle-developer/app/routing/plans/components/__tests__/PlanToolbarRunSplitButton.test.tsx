import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { action } from '~/routes/plans.$planId._index';
import {
  PLAN_RUN_CANCEL_SCHEDULED_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';

import type { PlanToolbarRunSplitButtonProps } from '../PlanToolbarRunSplitButton';
import { PlanToolbarRunSplitButton } from '../PlanToolbarRunSplitButton';

type BaseProps = Omit<PlanToolbarRunSplitButtonProps, 'fetcherRunPlan'>;

const SCHEDULED_AT = '2026-11-03T21:00:00.000Z';

describe('PlanToolbarRunSplitButton Component', () => {
  let component: RenderResult;
  let props: BaseProps;
  let submitted: Record<string, string>[];

  const renderSplitButton = (overrides: Partial<BaseProps> = {}): void => {
    component?.unmount();
    props = { ...props, ...overrides };

    const Component = (): React.ReactElement => {
      const fetcherRunPlan = useFetcher<typeof action>();

      return (
        <TooltipProvider>
          <PlanToolbarRunSplitButton
            {...props}
            fetcherRunPlan={fetcherRunPlan}
          />
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          const formData = await request.formData();
          submitted.push(
            Object.fromEntries(
              [...formData.entries()].map(([key, value]) => [
                key,
                typeof value === 'string' ? value : '',
              ]),
            ),
          );

          return null;
        },
        path: '/',
      },
    ]);

    component = render(<RoutesStub />);
  };

  const getCaret = (): HTMLElement => {
    return component.getByRole('button', {
      name: PLAN_TOOLBAR_COPY.runCaretAriaLabel,
    });
  };

  beforeEach(() => {
    submitted = [];
    props = {
      branch: 'main',
      checkoutId: 'checkout-1',
      isRunning: false,
      isTerminal: false,
      jobRunHooksJson: '',
      onOpenCancelScheduled: vi.fn(),
      onOpenDialog: vi.fn(),
      planStatus: 'PENDING',
      ralphTuningJson: '{"iterations":3}',
      repositoryId: 'repo-1',
      scheduledRunAt: null,
      workflowRunBlocked: false,
      workingDirectory: '/work',
    };

    renderSplitButton();
  });

  test('renders the primary Run button and the caret in one button group', () => {
    const group = component.getByTestId('PlanToolbarRunSplitButton');

    expect(group).toHaveAttribute('role', 'group');
    expect(
      component.getByRole('button', { name: /add to queue/i }),
    ).toBeEnabled();
    expect(getCaret()).toBeEnabled();
  });

  test('primary Run still submits the one-click runPlan form unchanged', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: /add to queue/i }));

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      branch: 'main',
      checkoutId: 'checkout-1',
      intent: 'runPlan',
      ralphTuning: '{"iterations":3}',
      repositoryId: 'repo-1',
      workingDirectory: '/work',
    });
    expect(props.onOpenDialog).not.toHaveBeenCalled();
  });

  test('the caret lives outside the form, so clicking it never submits', async () => {
    const user = userEvent.setup();

    expect(getCaret().closest('form')).toBeNull();

    await user.click(getCaret());

    expect(
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.runWithOptionsLabel,
      }),
    ).toBeInTheDocument();
    expect(submitted).toHaveLength(0);
  });

  test('"Run with options…" opens the dialog on the run tab without submitting', async () => {
    const user = userEvent.setup();

    await user.click(getCaret());
    await user.click(
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.runWithOptionsLabel,
      }),
    );

    expect(props.onOpenDialog).toHaveBeenCalledExactlyOnceWith('run');
    expect(submitted).toHaveLength(0);
  });

  test('"Schedule…" opens the dialog on the schedule tab without submitting', async () => {
    const user = userEvent.setup();

    await user.click(getCaret());
    await user.click(
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.scheduleLabel,
      }),
    );

    expect(props.onOpenDialog).toHaveBeenCalledExactlyOnceWith('schedule');
    expect(submitted).toHaveLength(0);
  });

  test('a scheduled run disables primary Run and Run with options but not Schedule', async () => {
    const user = userEvent.setup();
    renderSplitButton({ scheduledRunAt: SCHEDULED_AT });

    expect(
      component.getByRole('button', { name: /add to queue/i }),
    ).toBeDisabled();

    await user.click(getCaret());

    expect(
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.runWithOptionsLabel,
      }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      component.getByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.scheduleLabel,
      }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('the caret menu offers Cancel scheduled run only when a run is scheduled', async () => {
    const user = userEvent.setup();

    await user.click(getCaret());
    await component.findByRole('menuitem', {
      name: PLAN_TOOLBAR_COPY.scheduleLabel,
    });
    expect(
      component.queryByRole('menuitem', {
        name: PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel,
      }),
    ).toBeNull();
    await user.keyboard('{Escape}');

    renderSplitButton({
      scheduledRunAt: SCHEDULED_AT,
      scheduledRunId: 'run-9',
    });
    await user.click(getCaret());

    await user.click(
      await component.findByRole('menuitem', {
        name: PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel,
      }),
    );
    expect(props.onOpenCancelScheduled).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveLength(0);
  });

  test('a terminal plan with a scheduled run keeps the caret for Cancel but disables run and schedule', async () => {
    const user = userEvent.setup();
    renderSplitButton({
      isTerminal: true,
      scheduledRunAt: SCHEDULED_AT,
      scheduledRunId: 'run-9',
    });

    expect(getCaret()).toBeEnabled();
    await user.click(getCaret());

    expect(
      await component.findByRole('menuitem', {
        name: PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel,
      }),
    ).not.toHaveAttribute('aria-disabled', 'true');
    expect(
      component.getByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.scheduleLabel,
      }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  test('a scheduled run explains itself in the primary Run tooltip', async () => {
    const user = userEvent.setup();
    renderSplitButton({ scheduledRunAt: SCHEDULED_AT });

    // Hover the form: a disabled button swallows pointer events, the trigger is its wrapper.
    const form = component
      .getByRole('button', { name: /add to queue/i })
      .closest('form');
    if (form === null) {
      throw new Error('expected the primary button inside a form');
    }
    await user.hover(form);

    const reason = await component.findAllByText(
      /A run is scheduled for .+; cancel it to run now\./,
      undefined,
      { timeout: 3_000 },
    );
    expect(reason.length).toBeGreaterThan(0);
  });

  test('a scheduled run outranks a missing branch in the tooltip but still gates Run', () => {
    renderSplitButton({ branch: '', scheduledRunAt: SCHEDULED_AT });

    expect(
      component.getByRole('button', { name: /add to queue/i }),
    ).toBeDisabled();
  });

  test('a running plan disables Run with options but leaves Schedule available', async () => {
    const user = userEvent.setup();
    renderSplitButton({ isRunning: true, planStatus: 'IN_PROGRESS' });

    await user.click(getCaret());

    expect(
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.runWithOptionsLabel,
      }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      component.getByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.scheduleLabel,
      }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('a terminal plan disables the primary button and the caret', () => {
    renderSplitButton({ isTerminal: true, planStatus: 'COMPLETED' });

    expect(
      component.getByRole('button', { name: /completed/i }),
    ).toBeDisabled();
    expect(getCaret()).toBeDisabled();
  });
});
