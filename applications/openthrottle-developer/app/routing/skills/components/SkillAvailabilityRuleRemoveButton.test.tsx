import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillAvailabilityRuleRemoveButton } from './SkillAvailabilityRuleRemoveButton';
import type { SkillAvailabilityRuleRemoveButtonProps } from './SkillAvailabilityRuleRemoveButton';

const renderRemoveButton = (
  props: SkillAvailabilityRuleRemoveButtonProps,
): {
  calls: { count: number; ruleId: string | null };
  component: RenderResult;
} => {
  const calls: { count: number; ruleId: string | null } = {
    count: 0,
    ruleId: null,
  };
  const RoutesStub = createRoutesStub([
    {
      Component: () => <SkillAvailabilityRuleRemoveButton {...props} />,
      action: async ({ request }) => {
        const formData = await request.formData();
        const ruleIdValue = formData.get('ruleId');
        calls.count += 1;
        calls.ruleId = typeof ruleIdValue === 'string' ? ruleIdValue : null;
        return { ok: true };
      },
      path: '/skills/availability',
    },
  ]);

  const component = render(
    <RoutesStub initialEntries={['/skills/availability']} />,
  );

  return { calls, component };
};

describe('SkillAvailabilityRuleRemoveButton Component', () => {
  test('renders a Remove rule trigger', () => {
    const { component } = renderRemoveButton({ ruleId: 'rule-1' });

    expect(
      component.getByRole('button', { name: 'Remove rule' }),
    ).toBeInTheDocument();
  });

  test('opens the confirm dialog when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const { component } = renderRemoveButton({ ruleId: 'rule-1' });

    await user.click(component.getByRole('button', { name: 'Remove rule' }));

    expect(
      component.getByRole('heading', { name: 'Remove rule' }),
    ).toBeInTheDocument();
    expect(component.getByText(/this cannot be undone/i)).toBeInTheDocument();
  });

  test('cancel closes the dialog without submitting removeRule', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderRemoveButton({ ruleId: 'rule-1' });

    await user.click(component.getByRole('button', { name: 'Remove rule' }));
    await user.click(component.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(
        component.queryByRole('heading', { name: 'Remove rule' }),
      ).not.toBeInTheDocument();
    });
    expect(calls.count).toBe(0);
  });

  test('confirming submits removeRule with the ruleId to the route action', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderRemoveButton({ ruleId: 'rule-1' });

    await user.click(component.getByRole('button', { name: 'Remove rule' }));
    const confirmButtons = component.getAllByRole('button', {
      name: 'Remove rule',
    });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(calls.count).toBe(1);
    });
    expect(calls.ruleId).toBe('rule-1');
  });
});
