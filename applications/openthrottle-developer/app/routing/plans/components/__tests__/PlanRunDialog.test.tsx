import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

import { buildPlanRunConfigJson } from '../../testing/plan-run-config';
import type { PlanRunDialogProps } from '../PlanRunDialog';
import { PlanRunDialog } from '../PlanRunDialog';

// 2026-11-02 12:00 PST (DST ended 2026-11-01), so a default schedule opens on 1:00 PM PST.
const NOW = new Date('2026-11-02T20:00:00.000Z');

const MODELS: ChatModelOption[] = [
  { groupId: 'claude', id: 'claude|opus', label: 'Opus' },
  { groupId: 'cursor', id: 'cursor', label: 'Cursor' },
];

type SubmittedForm = Record<string, string>;

interface RenderOptions {
  readonly actionResult?: unknown;
  readonly props?: Partial<PlanRunDialogProps>;
}

describe('PlanRunDialog Component', () => {
  let props: PlanRunDialogProps;
  let submitted: SubmittedForm[];

  const renderDialog = async (
    options: RenderOptions = {},
  ): Promise<RenderResult> => {
    props = { ...props, ...options.props };

    // The harness owns `open` so Cancel (onOpenChange(false)) really closes and
    // the outside button can reopen it, which is what an opening caller does.
    const Harness = (): React.ReactElement => {
      const [open, setOpen] = React.useState(props.open);

      return (
        <TooltipProvider>
          <button onClick={() => setOpen(true)} type="button">
            open dialog
          </button>
          <PlanRunDialog
            {...props}
            onOpenChange={(next) => {
              props.onOpenChange(next);
              setOpen(next);
            }}
            open={open}
          />
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([
      {
        Component: Harness,
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

          return options.actionResult ?? null;
        },
        path: '/',
      },
    ]);

    const component = render(<RoutesStub />);

    // Let the deferred model list resolve inside act before any assertion.
    await component.findByTestId('PlanRunModelPicker');

    return component;
  };

  const field = (component: RenderResult, name: string): string | null =>
    component
      .queryByTestId(`PlanRunDialog-field-${name}`)
      ?.getAttribute('value') ?? null;

  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    submitted = [];
    props = {
      branch: 'feat/run-dialog',
      checkoutId: 'checkout-1',
      mode: 'run',
      models: Promise.resolve(MODELS),
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      open: true,
      planId: 'plan-1',
      planStatus: 'PENDING',
      repositoryId: '',
      runConfigJson: buildPlanRunConfigJson({
        effort: 'high',
        executionBackend: 'claude',
        iterations: 7,
        model: 'opus',
      }),
      workingDirectory: '',
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('modes', () => {
    test('opens on the mode the caller asked for', async () => {
      const component = await renderDialog({ props: { mode: 'schedule' } });

      expect(component.getByRole('tab', { name: 'Schedule' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(
        component.getByTestId('PlanRunDialogSchedule'),
      ).toBeInTheDocument();
      expect(
        component.getByRole('button', { name: 'Schedule run' }),
      ).toBeEnabled();
    });

    test('switches between Run now and Schedule', async () => {
      const user = userEvent.setup();
      const component = await renderDialog();

      expect(component.queryByTestId('PlanRunDialogSchedule')).toBeNull();
      expect(field(component, 'intent')).toBe('runPlan');
      expect(component.getByRole('button', { name: 'Run now' })).toBeEnabled();

      await user.click(component.getByRole('tab', { name: 'Schedule' }));

      expect(
        component.getByTestId('PlanRunDialogSchedule'),
      ).toBeInTheDocument();
      expect(field(component, 'intent')).toBe('schedulePlanRun');
      expect(
        component.getByRole('button', { name: 'Schedule run' }),
      ).toBeEnabled();

      await user.click(component.getByRole('tab', { name: 'Run now' }));

      expect(component.queryByTestId('PlanRunDialogSchedule')).toBeNull();
      expect(field(component, 'intent')).toBe('runPlan');
    });
  });

  describe('plan settings', () => {
    test('says plainly that model and effort change the plan run config', async () => {
      const component = await renderDialog();

      expect(
        component.getByTestId('PlanRunDialogSettings-plan-notice'),
      ).toHaveTextContent("changes this plan's run config");
    });

    test('disables effort with the reason on cursor', async () => {
      const user = userEvent.setup();
      const component = await renderDialog({
        props: {
          runConfigJson: buildPlanRunConfigJson({
            executionBackend: 'cursor',
            model: 'auto',
          }),
        },
      });

      expect(component.getByRole('button', { name: 'Effort' })).toBeDisabled();

      await user.hover(component.getByTestId('PlanRunEffortControl-disabled'));

      expect(await component.findByRole('tooltip')).toHaveTextContent(
        'effort is part of the model you pick',
      );
    });

    test('labels iterations as this run only and names the plan value it resets to', async () => {
      const component = await renderDialog();

      expect(component.getByText('this run only')).toBeInTheDocument();
      expect(component.getByText(/configured 7/)).toBeInTheDocument();
      expect(component.getByLabelText('Iterations')).toHaveValue(7);
    });

    test('resets iterations to the plan value each time the dialog opens', async () => {
      const user = userEvent.setup();
      const component = await renderDialog();
      const iterations = component.getByLabelText('Iterations');

      await user.clear(iterations);
      await user.type(iterations, '12');
      expect(field(component, 'iterations')).toBe('12');

      await user.click(component.getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(component.queryByTestId('PlanRunDialog')).toBeNull(),
      );
      await user.click(component.getByRole('button', { name: 'open dialog' }));

      expect(await component.findByLabelText('Iterations')).toHaveValue(7);
      expect(field(component, 'iterations')).toBe('7');
    });

    test('blocks submit on an invalid iterations count', async () => {
      const user = userEvent.setup();
      const component = await renderDialog();

      await user.clear(component.getByLabelText('Iterations'));
      await user.type(component.getByLabelText('Iterations'), '0');

      expect(component.getByRole('button', { name: 'Run now' })).toBeDisabled();
      expect(
        component.getByTestId('PlanRunDialog-blocked-reason'),
      ).toHaveTextContent('whole number of at least 1');
    });
  });

  describe('workspace summary', () => {
    test('is read-only and links to the Configuration tab', async () => {
      const component = await renderDialog();

      expect(
        component.getByTestId('PlanRunDialogWorkspace-branch'),
      ).toHaveTextContent('feat/run-dialog');
      expect(
        component.getByTestId('PlanRunDialogWorkspace').querySelector('input'),
      ).toBeNull();
      expect(
        component.getByTestId('PlanRunDialogWorkspace-link'),
      ).toHaveAttribute('href', expect.stringContaining('tab=configuration'));
    });
  });

  describe('submit gating', () => {
    test('is enabled when branch and checkout are set', async () => {
      const component = await renderDialog();

      expect(component.getByRole('button', { name: 'Run now' })).toBeEnabled();
      expect(
        component.queryByTestId('PlanRunDialog-blocked-reason'),
      ).toBeNull();
    });

    test('is disabled with a named reason when the branch is blank', async () => {
      const component = await renderDialog({ props: { branch: '  ' } });

      expect(component.getByRole('button', { name: 'Run now' })).toBeDisabled();
      expect(
        component.getByTestId('PlanRunDialog-blocked-reason'),
      ).toHaveTextContent('Set the git branch in Configuration');
    });

    test('does not block a monorepo-root run with no checkout', async () => {
      const component = await renderDialog({ props: { checkoutId: '' } });

      expect(component.getByRole('button', { name: 'Run now' })).toBeEnabled();
      expect(
        component.queryByTestId('PlanRunDialog-blocked-reason'),
      ).toBeNull();
    });
  });

  describe('schedule', () => {
    test('echoes the picked instant in local time, in plain language', async () => {
      const user = userEvent.setup();
      const component = await renderDialog({ props: { mode: 'schedule' } });

      expect(
        component.getByTestId('PlanRunDialogSchedule-zone'),
      ).toHaveTextContent('Local time (America/Los_Angeles)');
      expect(
        component.getByTestId('PlanRunDialogSchedule-summary'),
      ).toHaveTextContent('fires 1:00 PM PST, in about 1 hour');

      const time = component.getByLabelText('Time');
      await user.clear(time);
      await user.type(time, '15:00');

      expect(
        component.getByTestId('PlanRunDialogSchedule-summary'),
      ).toHaveTextContent('fires 3:00 PM PST, in about 3 hours');
    });

    test('blocks a past instant client-side', async () => {
      const user = userEvent.setup();
      const component = await renderDialog({ props: { mode: 'schedule' } });
      const time = component.getByLabelText('Time');

      await user.clear(time);
      await user.type(time, '09:00');

      expect(
        component.getByTestId('PlanRunDialogSchedule-error'),
      ).toHaveTextContent('already passed');
      expect(
        component.queryByTestId('PlanRunDialogSchedule-summary'),
      ).toBeNull();
      expect(
        component.getByRole('button', { name: 'Schedule run' }),
      ).toBeDisabled();
    });

    test('blocks an instant more than 30 days out and names the cap', async () => {
      const user = userEvent.setup();
      const component = await renderDialog({ props: { mode: 'schedule' } });

      await user.click(component.getByRole('button', { name: /Nov/ }));
      await user.click(component.getByRole('button', { name: /next month/i }));
      await user.click(
        component.getByRole('button', { name: /December 31st/ }),
      );

      expect(
        component.getByTestId('PlanRunDialogSchedule-error'),
      ).toHaveTextContent('at most 30 days ahead');
      expect(
        component.getByRole('button', { name: 'Schedule run' }),
      ).toBeDisabled();
    });
  });

  describe('form fields', () => {
    test('Run now carries iterations, backend, model and effort', async () => {
      const component = await renderDialog();

      expect(field(component, 'iterations')).toBe('7');
      expect(field(component, 'backend')).toBe('claude');
      expect(field(component, 'model')).toBe('opus');
      expect(field(component, 'effort')).toBe('high');
      expect(field(component, 'branch')).toBe('feat/run-dialog');
      expect(field(component, 'checkoutId')).toBe('checkout-1');
      expect(field(component, 'scheduledFor')).toBeNull();
    });

    test('Schedule also carries scheduledFor as an ISO instant', async () => {
      const component = await renderDialog({ props: { mode: 'schedule' } });

      expect(field(component, 'intent')).toBe('schedulePlanRun');
      expect(field(component, 'scheduledFor')).toBe('2026-11-02T21:00:00.000Z');
      expect(field(component, 'iterations')).toBe('7');
      expect(field(component, 'backend')).toBe('claude');
    });
  });

  describe('submission', () => {
    test('posts the form, reports success, and closes', async () => {
      const user = userEvent.setup();
      const result = {
        executionBackend: 'claude',
        jobId: 'job-9',
        planId: 'plan-1',
      };
      const component = await renderDialog({
        actionResult: { runPlan: result },
      });

      await user.click(component.getByRole('button', { name: 'Run now' }));

      await waitFor(() =>
        expect(props.onSubmitted).toHaveBeenCalledWith({ mode: 'run', result }),
      );
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
      expect(submitted[0]).toMatchObject({
        backend: 'claude',
        branch: 'feat/run-dialog',
        effort: 'high',
        intent: 'runPlan',
        iterations: '7',
        model: 'opus',
      });
    });

    test('surfaces the action error inline and stays open', async () => {
      const user = userEvent.setup();
      const component = await renderDialog({
        actionResult: {
          schedulePlanRunError: 'Scheduled time is in the past.',
        },
        props: { mode: 'schedule' },
      });

      await user.click(component.getByRole('button', { name: 'Schedule run' }));

      expect(
        await component.findByTestId('PlanRunDialog-error'),
      ).toHaveTextContent('Scheduled time is in the past.');
      expect(props.onSubmitted).not.toHaveBeenCalled();
      expect(props.onOpenChange).not.toHaveBeenCalled();
    });
  });
});
