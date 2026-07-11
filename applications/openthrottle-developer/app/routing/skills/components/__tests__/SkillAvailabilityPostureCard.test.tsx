import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { SkillAvailabilityPostureCard } from '../SkillAvailabilityPostureCard';
import type { SkillAvailabilityPostureCardProps } from '../SkillAvailabilityPostureCard';

interface Captured {
  intent: string | null;
  posture: string | null;
}

const renderCard = (
  props: SkillAvailabilityPostureCardProps,
): { captured: Captured; component: RenderResult } => {
  const captured: Captured = { intent: null, posture: null };
  const Stub = createRoutesStub([
    {
      Component: () => (
        <TooltipProvider>
          <SkillAvailabilityPostureCard {...props} />
        </TooltipProvider>
      ),
      action: async ({ request }) => {
        const fd = await request.formData();
        const intent = fd.get('intent');
        const posture = fd.get('posture');
        captured.intent = typeof intent === 'string' ? intent : null;
        captured.posture = typeof posture === 'string' ? posture : null;
        return { intent, ok: true };
      },
      path: '/skills/availability',
    },
  ]);
  const component = render(<Stub initialEntries={['/skills/availability']} />);
  return { captured, component };
};

describe('SkillAvailabilityPostureCard Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the passthrough note and posture toggle when there is no rule set', () => {
    const { component } = renderCard({ hasRuleSet: false, posture: null });

    expect(
      component.getByTestId('SkillAvailabilityPostureCard'),
    ).toBeInTheDocument();
    expect(
      component.getByText(/No rule set for this project/i),
    ).toBeInTheDocument();
    expect(component.getByText('Allow (passthrough)')).toBeInTheDocument();
    expect(component.getByText('Deny (default-deny)')).toBeInTheDocument();
  });

  test('selecting deny and saving submits the upsertRuleSet intent with posture=deny', async () => {
    const user = userEvent.setup();
    const { captured, component } = renderCard({
      hasRuleSet: false,
      posture: null,
    });

    await user.click(component.getByText('Deny (default-deny)'));
    await user.click(component.getByRole('button', { name: /Save posture/i }));

    await waitFor(() => {
      expect(captured.intent).toBe('upsertRuleSet');
    });
    expect(captured.posture).toBe('deny');
  });

  test('offers reset-to-passthrough only when a rule set exists', () => {
    const { component } = renderCard({ hasRuleSet: true, posture: 'allow' });

    expect(
      component.getByRole('button', { name: /Reset to passthrough/i }),
    ).toBeInTheDocument();
  });
});
