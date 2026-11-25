import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_OT_LOOP_COPY } from '~/routing/plans/data/copy';

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
      driver: 'claude',
      effort: 'high',
      model: 'opus',
      models: Promise.resolve(MODELS),
      onEffortChange: vi.fn(),
      onModelChange: vi.fn(),
      onOtLoopMaxRetriesChange: vi.fn(),
      onOtLoopValidationChange: vi.fn(),
      otLoopMaxRetriesError: undefined,
      otLoopMaxRetriesText: '',
      otLoopValidationText: '',
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

  describe('OT Loop fields', () => {
    test('has no runner choice or iterations field', async () => {
      const component = await renderSettings();

      expect(component.queryByRole('radio')).not.toBeInTheDocument();
      expect(component.queryByLabelText('Iterations')).not.toBeInTheDocument();
    });

    test('shows validation and retries', async () => {
      const component = await renderSettings();

      expect(
        component.getByRole('textbox', {
          name: PLAN_RUN_OT_LOOP_COPY.validationLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('spinbutton', {
          name: PLAN_RUN_OT_LOOP_COPY.maxRetriesLabel,
        }),
      ).toBeInTheDocument();
    });

    test('edits are reported', async () => {
      const user = userEvent.setup();
      const component = await renderSettings();

      await user.type(
        component.getByRole('textbox', {
          name: PLAN_RUN_OT_LOOP_COPY.validationLabel,
        }),
        'x',
      );
      await user.type(
        component.getByRole('spinbutton', {
          name: PLAN_RUN_OT_LOOP_COPY.maxRetriesLabel,
        }),
        '2',
      );

      expect(props.onOtLoopValidationChange).toHaveBeenCalledWith('x');
      expect(props.onOtLoopMaxRetriesChange).toHaveBeenCalledWith('2');
    });
  });
});
