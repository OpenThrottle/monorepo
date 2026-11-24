import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { PLAN_WORKFLOW_CONFIG_ACTIONS_COPY } from '~/routing/plans/data/data.copy';

import { PlanWorkflowConfigActions } from '../PlanWorkflowConfigActions';

describe('PlanWorkflowConfigActions Component', () => {
  test('shows the heading and the toolbar note, with no CLI preview', () => {
    const component = render(<PlanWorkflowConfigActions />);

    expect(
      component.getByRole('heading', {
        name: PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.heading,
      }),
    ).toBeInTheDocument();
    expect(component.getByRole('note')).toHaveTextContent(
      PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.note,
    );
    expect(
      component.queryByTestId('workflow-run-cli-preview'),
    ).not.toBeInTheDocument();
  });

  test('disables reset when no handler is given and omits save', () => {
    const component = render(<PlanWorkflowConfigActions />);

    expect(
      component.getByRole('button', {
        name: PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.resetLabel,
      }),
    ).toBeDisabled();
    expect(
      component.queryByRole('button', {
        name: PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.saveLabel,
      }),
    ).not.toBeInTheDocument();
  });

  test('calls reset and save when their buttons are clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const onSave = vi.fn();
    const component = render(
      <PlanWorkflowConfigActions onReset={onReset} onSave={onSave} />,
    );

    await user.click(
      component.getByRole('button', {
        name: PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.resetLabel,
      }),
    );
    await user.click(
      component.getByRole('button', {
        name: PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.saveLabel,
      }),
    );

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('disables save while saving and shows the pending label', () => {
    const component = render(
      <PlanWorkflowConfigActions onSave={vi.fn()} savePending={true} />,
    );

    expect(
      component.getByRole('button', {
        name: PLAN_WORKFLOW_CONFIG_ACTIONS_COPY.savePendingLabel,
      }),
    ).toBeDisabled();
  });
});
