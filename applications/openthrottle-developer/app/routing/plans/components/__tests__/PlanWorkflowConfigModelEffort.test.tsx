import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

import type { PlanWorkflowConfigModelEffortProps } from '../PlanWorkflowConfigModelEffort';
import { PlanWorkflowConfigModelEffort } from '../PlanWorkflowConfigModelEffort';

const applyUpdater = (
  setInput: ReturnType<typeof vi.fn>,
  prev: WorkflowRalphRunOptionsInput,
): WorkflowRalphRunOptionsInput | undefined => {
  const updater: unknown = setInput.mock.calls[0]?.[0];

  return typeof updater === 'function' ? updater(prev) : undefined;
};

describe('PlanWorkflowConfigModelEffort Component', () => {
  let props: PlanWorkflowConfigModelEffortProps;
  const setInput = vi.fn();

  const renderFields = (): RenderResult => {
    return render(
      <TooltipProvider>
        <PlanWorkflowConfigModelEffort {...props} />
      </TooltipProvider>,
    );
  };

  beforeEach(() => {
    setInput.mockReset();
    props = {
      input: getDefaultWorkflowRalphRunOptionsInput(),
      models: Promise.resolve(MOCK_PLAN_RUN_MODELS),
      setInput,
    };
  });

  test('renders the shared model picker once models resolve', async () => {
    const component = renderFields();

    expect(
      await component.findByTestId('ChatModelPicker-trigger'),
    ).toHaveTextContent('auto');
  });

  test('disables effort with a reason on the default cursor runner', async () => {
    const component = renderFields();
    await component.findByTestId('ChatModelPicker-trigger');

    expect(
      component.getByTestId('PlanRunEffortControl-disabled'),
    ).toBeInTheDocument();
  });

  test('writes model and backend together, and drops an effort the new runner lacks', async () => {
    const user = userEvent.setup();
    props = {
      ...props,
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput(),
        effort: 'max',
        executionBackend: 'claude',
        model: 'opus',
      },
    };
    const component = renderFields();

    await user.click(await component.findByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-cursor'));
    await user.click(
      component.getByTestId('ChatModelPicker-option-cursor-cursor|gpt-5.2'),
    );

    expect(applyUpdater(setInput, props.input)).toMatchObject({
      effort: '',
      executionBackend: 'cursor',
      model: 'gpt-5.2',
    });
  });

  test('keeps an effort the new runner still supports', async () => {
    const user = userEvent.setup();
    props = {
      ...props,
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput(),
        effort: 'high',
        executionBackend: 'claude',
        model: 'opus',
      },
    };
    const component = renderFields();

    await user.click(await component.findByTestId('ChatModelPicker-trigger'));
    await user.click(
      component.getByTestId('ChatModelPicker-option-claude-claude|opus'),
    );

    expect(applyUpdater(setInput, props.input)).toMatchObject({
      effort: 'high',
      executionBackend: 'claude',
    });
  });

  test('writes effort from the shared control on claude', async () => {
    const user = userEvent.setup();
    props = {
      ...props,
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput(),
        executionBackend: 'claude',
        model: 'opus',
      },
    };
    const component = renderFields();

    await user.click(
      await component.findByTestId('ChatReasoningTierControl-trigger'),
    );
    await user.click(
      component.getByTestId('ChatReasoningTierControl-reasoning-extraHigh'),
    );

    expect(applyUpdater(setInput, props.input)).toMatchObject({
      effort: 'extraHigh',
    });
  });

  test('falls back to a muted line when model discovery rejects', async () => {
    props = { ...props, models: Promise.reject(new Error('probe failed')) };
    const component = renderFields();

    expect(
      await component.findByText('Could not load the model list.'),
    ).toBeInTheDocument();
  });
});
