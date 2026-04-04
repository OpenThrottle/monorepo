import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanWorkflowConfigTarget } from '../PlanWorkflowConfigTarget';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

const PLAN_ID_FIXTURE = '0c2720a9-920f-4b16-865a-f803eb444e18';

describe('PlanWorkflowConfigTarget Component', () => {
  test('renders run target fieldset with legend and stable ids', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput();
    const Component = () => (
      <PlanWorkflowConfigTarget input={input} setInput={() => {}} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('PlanWorkflowConfigTarget'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('group', { name: 'Run target' }),
    ).toBeInTheDocument();
    expect(
      document.getElementById('workflow-run-target-legend'),
    ).toHaveTextContent('Run target');
  });

  test('shows --plan input with value when input.planId is set in plan mode', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: PLAN_ID_FIXTURE,
    });
    const Component = () => (
      <PlanWorkflowConfigTarget input={input} setInput={() => {}} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('workflow-run-plan-id-input')).toHaveValue(
      PLAN_ID_FIXTURE,
    );
  });

  test('shows UUID alert when plan id is not a valid Cortex UUID', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [state, setState] = React.useState(
        getDefaultWorkflowRalphRunOptionsInput(),
      );
      return <PlanWorkflowConfigTarget input={state} setInput={setState} />;
    };
    const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);
    const { getByLabelText, getByRole } = render(<RoutesStub />);

    const planInput = getByLabelText('Cortex plan UUID for --plan');
    await user.clear(planInput);
    await user.type(planInput, 'not-a-valid-uuid');

    expect(getByRole('alert')).toHaveTextContent(
      'Value does not match a Cortex UUID (v4) pattern',
    );
  });

  test('switches to task mode and shows --task input', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [state, setState] = React.useState(
        getDefaultWorkflowRalphRunOptionsInput(),
      );
      return <PlanWorkflowConfigTarget input={state} setInput={setState} />;
    };
    const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);
    const { findByRole, getByRole, getByTestId, getByLabelText } = render(
      <RoutesStub />,
    );

    await user.click(
      getByRole('combobox', { name: 'Cortex run target: plan or task' }),
    );
    const taskOption = await findByRole('option', { name: /Cortex task/ });
    await user.click(taskOption);

    expect(getByTestId('workflow-run-task-id-input')).toBeInTheDocument();
    expect(getByLabelText('Cortex task UUID for --task')).toBeInTheDocument();
  });

  test('shows UUID alert for invalid task id in task mode', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [state, setState] = React.useState(
        getDefaultWorkflowRalphRunOptionsInput(),
      );
      return <PlanWorkflowConfigTarget input={state} setInput={setState} />;
    };
    const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);
    const { findByRole, getByLabelText, getByRole } = render(<RoutesStub />);

    await user.click(
      getByRole('combobox', { name: 'Cortex run target: plan or task' }),
    );
    const taskOption = await findByRole('option', { name: /Cortex task/ });
    await user.click(taskOption);

    const taskInput = getByLabelText('Cortex task UUID for --task');
    await user.type(taskInput, 'bad');

    expect(getByRole('alert')).toHaveTextContent(
      'Value does not match a Cortex UUID (v4) pattern',
    );
  });
});
