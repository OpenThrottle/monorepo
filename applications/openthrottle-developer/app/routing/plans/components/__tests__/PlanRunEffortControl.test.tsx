import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanRunEffortControlProps } from '../PlanRunEffortControl';
import { PlanRunEffortControl } from '../PlanRunEffortControl';

describe('PlanRunEffortControl Component', () => {
  let props: PlanRunEffortControlProps;

  const renderControl = (): RenderResult =>
    render(
      <TooltipProvider>
        <PlanRunEffortControl {...props} />
      </TooltipProvider>,
    );

  beforeEach(() => {
    props = {
      backend: 'claude',
      effort: 'high',
      onEffortChange: vi.fn(),
    };
  });

  describe('when the backend has a reasoning knob (claude)', () => {
    test('is enabled and reflects the stored effort', () => {
      const component = renderControl();

      const trigger = component.getByTestId('ChatReasoningTierControl-trigger');

      expect(trigger).toBeEnabled();
      expect(trigger).toHaveTextContent('High');
      expect(
        component.queryByTestId('PlanRunEffortControl-disabled'),
      ).not.toBeInTheDocument();
    });

    test('offers claude levels and writes the chosen one', async () => {
      const user = userEvent.setup();
      const component = renderControl();

      await user.click(
        component.getByTestId('ChatReasoningTierControl-trigger'),
      );

      expect(
        component.getByTestId('ChatReasoningTierControl-reasoning-extraHigh'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('ChatReasoningTierControl-reasoning-max'),
      ).toBeInTheDocument();
      // claude does not advertise ultra, and a plan run has no service tier.
      expect(
        component.queryByTestId('ChatReasoningTierControl-reasoning-ultra'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('ChatReasoningTierControl-tier-fast'),
      ).not.toBeInTheDocument();

      await user.click(
        component.getByTestId('ChatReasoningTierControl-reasoning-max'),
      );

      expect(props.onEffortChange).toHaveBeenCalledWith('max');
    });
  });

  describe('when the backend has no reasoning knob (cursor)', () => {
    beforeEach(() => {
      props = { ...props, backend: 'cursor', effort: '' };
    });

    test('renders disabled instead of disappearing', () => {
      const component = renderControl();

      expect(
        component.getByTestId('PlanRunEffortControl-disabled'),
      ).toBeInTheDocument();
      expect(component.getByRole('button', { name: 'Effort' })).toBeDisabled();
      expect(
        component.queryByTestId('ChatReasoningTierControl-trigger'),
      ).not.toBeInTheDocument();
    });

    test('says why on hover and names the fix', async () => {
      const user = userEvent.setup();
      const component = renderControl();

      await user.hover(component.getByTestId('PlanRunEffortControl-disabled'));

      const tooltip = await component.findByRole('tooltip');

      expect(tooltip).toHaveTextContent('effort is part of the model you pick');
      expect(tooltip).toHaveTextContent('Cursor');
    });

    test('exposes the reason to assistive tech on the focusable wrapper', () => {
      const component = renderControl();

      const wrapper = component.getByTestId('PlanRunEffortControl-disabled');
      const describedBy = wrapper.getAttribute('aria-describedby');

      expect(wrapper).toHaveAttribute('tabindex', '0');
      expect(describedBy).not.toBeNull();
      expect(
        describedBy === null ? null : document.getElementById(describedBy),
      ).toHaveTextContent('effort is part of the model you pick');
    });
  });
});
