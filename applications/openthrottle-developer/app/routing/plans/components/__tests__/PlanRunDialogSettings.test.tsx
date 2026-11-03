import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
      planIterations: 5,
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
});
