import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';

import type { PlanRunModelPickerProps } from '../PlanRunModelPicker';
import { PlanRunModelPicker } from '../PlanRunModelPicker';

describe('PlanRunModelPicker Component', () => {
  let props: PlanRunModelPickerProps;

  const renderPicker = (): RenderResult =>
    render(
      <TooltipProvider>
        <PlanRunModelPicker {...props} />
      </TooltipProvider>,
    );

  beforeEach(() => {
    props = {
      backend: 'cursor',
      model: 'gpt-5.2',
      models: MOCK_PLAN_RUN_MODELS,
      onChange: vi.fn(),
    };
  });

  test('shows the stored model as the selection', () => {
    const component = renderPicker();

    expect(component.getByTestId('ChatModelPicker-trigger')).toHaveTextContent(
      'gpt-5.2',
    );
  });

  test('writes the model and the backend it belongs to when another runner is picked', async () => {
    const user = userEvent.setup();
    const component = renderPicker();

    await user.click(component.getByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-claude'));
    await user.click(
      component.getByTestId('ChatModelPicker-option-claude-claude|opus'),
    );

    expect(props.onChange).toHaveBeenCalledWith({
      backend: 'claude',
      model: 'opus',
    });
  });

  test('offers only models a plan run can execute, not local endpoints', async () => {
    const user = userEvent.setup();
    const component = renderPicker();

    await user.click(component.getByTestId('ChatModelPicker-trigger'));

    expect(
      component.getByTestId('ChatModelPicker-rail-item-cursor'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-rail-item-openai:lmstudio'),
    ).not.toBeInTheDocument();
  });

  test('shows the default model as selected for the default runner', () => {
    props = { ...props, model: 'auto' };
    const component = renderPicker();

    expect(component.getByTestId('ChatModelPicker-trigger')).toHaveTextContent(
      'auto',
    );
  });

  test('names the fix when no runnable models were discovered', () => {
    props = { ...props, models: [] };
    const component = renderPicker();

    expect(component.getByTestId('PlanRunModelPicker-empty')).toHaveTextContent(
      'Settings',
    );
    expect(
      component.queryByTestId('ChatModelPicker-trigger'),
    ).not.toBeInTheDocument();
  });
});
