import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanToolbar } from './PlanToolbar';
import type { PlanToolbarProps } from './PlanToolbar';

const PLAN_ID = 'plan-123';

/**
 * Render the toolbar inside a routes stub whose action records the submitted
 * FormData entries, so we can assert the fetcher posts the right intent +
 * planId. The Request body is consumed once (inside the action) and the parsed
 * values are surfaced via `submitted`.
 */
const renderToolbar = (
  props: Partial<PlanToolbarProps> = {},
): {
  component: RenderResult;
  submitted: {
    intent: FormDataEntryValue | null;
    planId: FormDataEntryValue | null;
  }[];
} => {
  const submitted: {
    intent: FormDataEntryValue | null;
    planId: FormDataEntryValue | null;
  }[] = [];

  const action = async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    submitted.push({
      intent: formData.get('intent'),
      planId: formData.get('planId'),
    });
    return { evaluatePlanRulesTriggered: true };
  };

  const Component = () => (
    <TooltipProvider>
      <PlanToolbar planId={PLAN_ID} {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);
  const component = render(<RoutesStub />);

  return { component, submitted };
};

describe('PlanToolbar Component', () => {
  test('renders the Evaluate rules button', () => {
    const { component } = renderToolbar();

    expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /evaluate rules/i }),
    ).toBeInTheDocument();
  });

  test('submits the evaluatePlanRules intent with the planId', async () => {
    const { component, submitted } = renderToolbar();
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: /evaluate rules/i }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      intent: 'evaluatePlanRules',
      planId: PLAN_ID,
    });
  });
});
