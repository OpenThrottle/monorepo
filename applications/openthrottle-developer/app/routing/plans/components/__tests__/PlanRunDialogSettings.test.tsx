import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_RUNNER_COPY } from '~/routing/plans/data/data.copy';

import type { PlanRunDialogSettingsProps } from '../PlanRunDialogSettings';
import { PlanRunDialogSettings } from '../PlanRunDialogSettings';

const MODELS: ChatModelOption[] = [
  { groupId: 'claude', id: 'claude|opus', label: 'Opus' },
];

describe('PlanRunDialogSettings Component', () => {
  let props: PlanRunDialogSettingsProps;

  const renderSettings = async (): Promise<RenderResult> => {
    const component = render(
      <TooltipProvider>
        <PlanRunDialogSettings {...props} />
      </TooltipProvider>,
    );
    await component.findByTestId('PlanRunModelPicker');

    return component;
  };

  beforeEach(() => {
    props = {
      backend: 'claude',
      effort: 'high',
      iterationsError: undefined,
      iterationsText: '5',
      model: 'opus',
      models: Promise.resolve(MODELS),
      onEffortChange: vi.fn(),
      onIterationsChange: vi.fn(),
      onModelChange: vi.fn(),
      onOtLoopMaxRetriesChange: vi.fn(),
      onOtLoopValidationChange: vi.fn(),
      onRunnerChange: vi.fn(),
      otLoopMaxRetriesError: undefined,
      otLoopMaxRetriesText: '',
      otLoopValidationText: '',
      planIterations: 5,
      runner: 'ralph',
    };
  });

  test('presents model and effort as plan settings', async () => {
    const component = await renderSettings();

    expect(
      component.getByTestId('PlanRunDialogSettings-plan-notice'),
    ).toHaveTextContent("changes this plan's run config");
    expect(
      component.getByTestId('ChatReasoningTierControl-trigger'),
    ).toHaveTextContent('High');
  });

  test('presents iterations as this run only and says what it resets to', async () => {
    const component = await renderSettings();

    expect(component.getByText('this run only')).toBeInTheDocument();
    expect(component.getByText(/configured 5/)).toBeInTheDocument();
    expect(component.getByLabelText('Iterations')).toHaveValue(5);
  });

  test('reports an iterations edit', async () => {
    const user = userEvent.setup();
    const component = await renderSettings();

    await user.type(component.getByLabelText('Iterations'), '0');

    expect(props.onIterationsChange).toHaveBeenLastCalledWith('50');
  });

  test('marks the iterations field invalid on error', async () => {
    props = { ...props, iterationsError: 'Iterations must be a whole number.' };
    const component = await renderSettings();

    expect(component.getByLabelText('Iterations')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  describe('runner', () => {
    test('reports a runner change', async () => {
      const user = userEvent.setup();
      const component = await renderSettings();

      await user.click(
        component.getByRole('radio', {
          name: PLAN_RUN_RUNNER_COPY.otLoopLabel,
        }),
      );

      expect(props.onRunnerChange).toHaveBeenCalledWith('ot-loop');
    });

    test('Ralph shows iterations and hides the OT Loop fields', async () => {
      const component = await renderSettings();

      expect(component.getByLabelText('Iterations')).toBeInTheDocument();
      expect(
        component.queryByTestId('PlanRunOtLoopFields'),
      ).not.toBeInTheDocument();
    });

    test('OT Loop hides iterations and shows validation and retries', async () => {
      props = { ...props, runner: 'ot-loop' };
      const component = await renderSettings();

      expect(component.queryByLabelText('Iterations')).not.toBeInTheDocument();
      expect(
        component.getByRole('textbox', {
          name: PLAN_RUN_RUNNER_COPY.validationLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('spinbutton', {
          name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
        }),
      ).toBeInTheDocument();
    });

    test('OT Loop edits are reported', async () => {
      const user = userEvent.setup();
      props = { ...props, runner: 'ot-loop' };
      const component = await renderSettings();

      await user.type(
        component.getByRole('textbox', {
          name: PLAN_RUN_RUNNER_COPY.validationLabel,
        }),
        'x',
      );
      await user.type(
        component.getByRole('spinbutton', {
          name: PLAN_RUN_RUNNER_COPY.maxRetriesLabel,
        }),
        '2',
      );

      expect(props.onOtLoopValidationChange).toHaveBeenCalledWith('x');
      expect(props.onOtLoopMaxRetriesChange).toHaveBeenCalledWith('2');
    });
  });
});
