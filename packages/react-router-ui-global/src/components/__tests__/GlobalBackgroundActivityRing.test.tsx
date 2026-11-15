import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { GlobalBackgroundActivityRingProps } from '../GlobalBackgroundActivityRing';
import { GlobalBackgroundActivityRing } from '../GlobalBackgroundActivityRing';

const renderRing = (
  activities: GlobalBackgroundActivityRingProps['activities'],
) => {
  return render(
    <TooltipProvider>
      <GlobalBackgroundActivityRing activities={activities}>
        <div data-testid="StatusDot" />
      </GlobalBackgroundActivityRing>
    </TooltipProvider>,
  );
};

const ACTIVITY = {
  done: 75,
  etaSeconds: 30,
  id: 'embeddings_backfill:code',
  label: 'Embedding code chunks',
  startedAt: '2026-11-15T18:00:00.000Z',
  status: 'running',
  total: 100,
};

describe('GlobalBackgroundActivityRing Component', () => {
  test('wraps the status dot and reports the share done', () => {
    const component = renderRing([ACTIVITY]);

    const ring = component.getByRole('progressbar');

    expect(ring).toHaveAttribute('aria-valuenow', '75');
    expect(component.getByTestId('StatusDot')).toBeInTheDocument();
  });

  test('spins without a value when the total is unknown', () => {
    const component = renderRing([{ ...ACTIVITY, total: null }]);

    const ring = component.getByRole('progressbar');

    expect(ring).not.toHaveAttribute('aria-valuenow');
    expect(ring.querySelector('svg')).toHaveClass('animate-spin');
  });
});
