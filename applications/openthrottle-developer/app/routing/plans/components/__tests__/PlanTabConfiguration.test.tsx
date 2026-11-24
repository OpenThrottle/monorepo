import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultStore } from 'jotai/vanilla';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  resetWorkflowRunToDefaultsAtom,
  workflowRunOptionsAtom,
} from '~/routing/plans/data/data.atom-plan';
import { PLAN_RUN_OT_LOOP_COPY } from '~/routing/plans/data/data.copy';
import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';

import type { PlanTabConfigurationProps } from '../PlanTabConfiguration';
import { PlanTabConfiguration } from '../PlanTabConfiguration';

const renderTab = (props: PlanTabConfigurationProps) => {
  const Component = () => {
    return (
      <TooltipProvider>
        <Tabs value="configuration">
          <PlanTabConfiguration {...props} />
        </Tabs>
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('PlanTabConfiguration Component', () => {
  beforeEach(() => {
    getDefaultStore().set(resetWorkflowRunToDefaultsAtom, undefined);
  });

  test('renders the configuration header bar without a CLI preview', async () => {
    const props: PlanTabConfigurationProps = {
      models: Promise.resolve([]),
      onSaveJobRunHooks: () => undefined,
      repositories: Promise.resolve([]),
    };
    const { findByTestId, queryByTestId } = renderTab(props);

    // The whole tab body sits behind the deferred repositories boundary.
    expect(await findByTestId('PlanWorkflowConfigActions')).toBeInTheDocument();
    expect(queryByTestId('workflow-run-cli-preview')).not.toBeInTheDocument();
  });

  test('renders the skeleton while workspace repositories are pending', () => {
    const props: PlanTabConfigurationProps = {
      models: Promise.resolve([]),
      onSaveJobRunHooks: () => undefined,
      repositories: new Promise(() => {}),
    };
    const { getByTestId, queryByTestId } = renderTab(props);

    expect(getByTestId('PlanConfigurationTabSkeleton')).toBeInTheDocument();
    expect(queryByTestId('PlanWorkflowConfigActions')).not.toBeInTheDocument();
  });

  test('renders the model picker and writes model and driver to the run-config atom', async () => {
    const user = userEvent.setup();
    const props: PlanTabConfigurationProps = {
      models: Promise.resolve(MOCK_PLAN_RUN_MODELS),
      onSaveJobRunHooks: () => undefined,
      repositories: Promise.resolve([]),
    };
    const component = renderTab(props);

    await user.click(await component.findByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-claude'));
    await user.click(
      component.getByTestId('ChatModelPicker-option-claude-claude|opus'),
    );

    expect(getDefaultStore().get(workflowRunOptionsAtom)).toMatchObject({
      driver: 'claude',
      model: 'opus',
    });
    // Effort becomes a real control once the runner has a reasoning knob.
    expect(
      await component.findByTestId('ChatReasoningTierControl-trigger'),
    ).toBeEnabled();
  });

  test('keeps effort disabled with a reason on the default cursor runner', async () => {
    const props: PlanTabConfigurationProps = {
      models: Promise.resolve(MOCK_PLAN_RUN_MODELS),
      onSaveJobRunHooks: () => undefined,
      repositories: Promise.resolve([]),
    };
    const component = renderTab(props);

    expect(
      await component.findByTestId('PlanRunEffortControl-disabled'),
    ).toBeInTheDocument();
  });

  test('has no runner choice, prompt or iteration fields, and always shows the OT Loop fields', async () => {
    const props: PlanTabConfigurationProps = {
      models: Promise.resolve([]),
      onSaveJobRunHooks: () => undefined,
      repositories: Promise.resolve([]),
    };
    const component = renderTab(props);

    await component.findByTestId('PlanWorkflowConfigValidation');

    expect(component.queryByRole('radio')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('PlanWorkflowConfigPrompt'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByRole('spinbutton', { name: /Iteration count/ }),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('textbox', {
        name: PLAN_RUN_OT_LOOP_COPY.validationLabel,
      }),
    ).toBeInTheDocument();
  });
});
