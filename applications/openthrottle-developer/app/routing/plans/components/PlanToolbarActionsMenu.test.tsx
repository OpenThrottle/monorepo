import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbarActionsMenu } from './PlanToolbarActionsMenu';
import type { PlanToolbarActionsMenuProps } from './PlanToolbarActionsMenu';

const PLAN_ID = 'plan-123';

describe('PlanToolbarActionsMenu Component', () => {
  let component: RenderResult;
  let props: PlanToolbarActionsMenuProps;

  beforeEach(() => {
    props = { planId: PLAN_ID };
    const RoutesStub = createRoutesStub([
      {
        Component: () => (
          <TooltipProvider>
            <PlanToolbarActionsMenu {...props} />
          </TooltipProvider>
        ),
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  });

  test('renders the Actions trigger button', () => {
    expect(
      component.getByRole('button', { name: /actions/i }),
    ).toBeInTheDocument();
  });

  test('opens the menu with Add Task and Edit Plan links scoped to the plan', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: /actions/i }));

    expect(
      component.getByRole('menuitem', { name: /add task/i }),
    ).toHaveAttribute('href', `/plans/${PLAN_ID}/tasks/create`);
    expect(
      component.getByRole('menuitem', { name: /edit plan/i }),
    ).toHaveAttribute('href', `/plans/${PLAN_ID}/edit`);
  });
});
