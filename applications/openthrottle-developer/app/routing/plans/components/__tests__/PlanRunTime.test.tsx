import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunTime } from '../PlanRunTime';

const ISO = '2026-11-02T17:00:00.000Z';

const renderTime = (value: string | null) =>
  render(
    <TooltipProvider delayDuration={0}>
      <PlanRunTime value={value} />
    </TooltipProvider>,
  );

describe('PlanRunTime', () => {
  describe('on the server render', () => {
    test('renders absolute UTC so the hydrating render matches', () => {
      const html = renderToString(
        <TooltipProvider>
          <PlanRunTime value={ISO} />
        </TooltipProvider>,
      );

      expect(html).toContain(`dateTime="${ISO}"`);
      expect(html).toContain('Nov 2, 2026, 5:00 PM UTC');
    });
  });

  describe('after hydration', () => {
    test('renders a <time> with the ISO dateTime and a local label', () => {
      const component = renderTime(ISO);
      const time = component.getByTestId('PlanRunTime');

      expect(time.tagName).toBe('TIME');
      expect(time).toHaveAttribute('dateTime', ISO);
      expect(time).not.toHaveTextContent(/UTC$/);
    });

    test('shows UTC in a tooltip on hover', async () => {
      const user = userEvent.setup();
      const component = renderTime(ISO);

      await user.hover(component.getByTestId('PlanRunTime'));

      expect(
        (await component.findAllByText('Nov 2, 2026, 5:00 PM UTC')).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('when the value is unparseable', () => {
    test('renders the copy fallback without a <time>', () => {
      const component = renderTime('nope');
      const node = component.getByTestId('PlanRunTime');

      expect(node.tagName).toBe('SPAN');
      expect(node).toHaveTextContent(PLAN_RUN_TRANSPARENCY_COPY.time.unknown);
    });
  });
});
