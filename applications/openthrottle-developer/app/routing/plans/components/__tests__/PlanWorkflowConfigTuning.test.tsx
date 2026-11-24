import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';
import { getDefaultPlanRunOptions } from '~/routing/plans/utils/plan-run-options';

import type { PlanWorkflowConfigTuningProps } from '../PlanWorkflowConfigTuning';
import { PlanWorkflowConfigTuning } from '../PlanWorkflowConfigTuning';

describe('PlanWorkflowConfigTuning Component', () => {
  let props: PlanWorkflowConfigTuningProps;

  beforeEach(() => {
    props = {
      heading: '06. Run Tuning',
      input: getDefaultPlanRunOptions(),
      iterationTimeoutText: '',
      models: Promise.resolve(MOCK_PLAN_RUN_MODELS),
      setInput: vi.fn(),
      setIterationTimeoutText: vi.fn(),
    };
  });

  test('should render run tuning fieldset with tuning controls', async () => {
    const Component = () => {
      return (
        <TooltipProvider>
          <PlanWorkflowConfigTuning {...props} />
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('group', { name: '06. Run Tuning' }),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Agent timeout in seconds'),
    ).toBeInTheDocument();
    // The free-text --model input is replaced by the shared model picker.
    expect(
      await component.findByTestId('ChatModelPicker-trigger'),
    ).toBeInTheDocument();
    expect(
      component.queryByLabelText('Cursor model for --model'),
    ).not.toBeInTheDocument();
    // Effort sits beside it, disabled-with-reason on the default (cursor) runner.
    expect(
      component.getByTestId('PlanRunEffortControl-disabled'),
    ).toBeInTheDocument();
    // Fields only the retired runner read are gone.
    expect(
      component.queryByLabelText('Iteration count for --iterations'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByLabelText('NX project name for --project'),
    ).not.toBeInTheDocument();
  });

  test('should call setIterationTimeoutText when iteration timeout input changes', async () => {
    const user = userEvent.setup();
    const setIterationTimeoutText = vi.fn();
    props = {
      ...props,
      setIterationTimeoutText,
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <TooltipProvider>
          <PlanWorkflowConfigTuning {...props} />
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    await user.type(getByLabelText('Agent timeout in seconds'), '1800');

    expect(setIterationTimeoutText.mock.calls.map((c) => c[0]).join('')).toBe(
      '1800',
    );
  });

  test('should write the picked model and its driver through setInput', async () => {
    const user = userEvent.setup();
    const setInput = vi.fn();
    props = { ...props, setInput };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <TooltipProvider>
          <PlanWorkflowConfigTuning {...props} />
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    await user.click(await component.findByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-claude'));
    await user.click(
      component.getByTestId('ChatModelPicker-option-claude-claude|opus'),
    );

    const updater = setInput.mock.calls[0]?.[0];
    expect(typeof updater).toBe('function');
    if (typeof updater === 'function') {
      expect(updater(props.input)).toMatchObject({
        driver: 'claude',
        model: 'opus',
      });
    }
  });
});
