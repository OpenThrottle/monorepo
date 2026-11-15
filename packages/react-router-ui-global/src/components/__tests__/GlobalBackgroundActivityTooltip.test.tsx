import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalBackgroundActivityTooltip } from '../GlobalBackgroundActivityTooltip';

const FIXED_NOW = Date.parse('2026-11-15T18:30:00.000Z');

const ACTIVITY = {
  done: 10,
  etaSeconds: null,
  id: 'embeddings_backfill:task',
  label: 'Embedding tasks',
  startedAt: '2026-11-15T18:29:00.000Z',
  status: 'stalled',
  total: 50,
};

describe('GlobalBackgroundActivityTooltip Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows nothing until the trigger is hovered, then one row per activity', async () => {
    const user = userEvent.setup();
    const component = render(
      <TooltipProvider>
        <GlobalBackgroundActivityTooltip activities={[ACTIVITY]} side="top">
          <button type="button">trigger</button>
        </GlobalBackgroundActivityTooltip>
      </TooltipProvider>,
    );

    expect(
      component.queryByTestId('GlobalBackgroundActivityTooltip'),
    ).not.toBeInTheDocument();

    await user.hover(component.getByRole('button', { name: 'trigger' }));

    const [tooltip] = await component.findAllByTestId(
      'GlobalBackgroundActivityTooltip',
    );

    expect(tooltip?.querySelectorAll('li')).toHaveLength(1);
    expect(tooltip).toHaveTextContent('Embedding tasks');
    expect(tooltip).toHaveTextContent('10 / 50');
  });
});
