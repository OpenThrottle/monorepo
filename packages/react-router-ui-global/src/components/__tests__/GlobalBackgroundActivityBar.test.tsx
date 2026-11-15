import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GLOBAL_BACKGROUND_ACTIVITY_COPY } from '../../data/data.copy';
import type { GlobalBackgroundActivityBarProps } from '../GlobalBackgroundActivityBar';
import { GlobalBackgroundActivityBar } from '../GlobalBackgroundActivityBar';

const renderBar = (props: GlobalBackgroundActivityBarProps) => {
  const Component = () => {
    return (
      <TooltipProvider>
        <GlobalBackgroundActivityBar {...props} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const ACTIVITY = {
  done: 40,
  etaSeconds: 60,
  id: 'embeddings_backfill:code',
  label: 'Embedding code chunks',
  startedAt: '2026-11-15T18:00:00.000Z',
  status: 'running',
  total: 100,
};

describe('GlobalBackgroundActivityBar Component', () => {
  test('links to the given page and reports the share done', () => {
    const component = renderBar({
      activities: [ACTIVITY],
      href: 'http://localhost/api/health',
    });

    expect(
      component.getByRole('link', {
        name: GLOBAL_BACKGROUND_ACTIVITY_COPY.label,
      }),
    ).toHaveAttribute('href', 'http://localhost/api/health');
    expect(component.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
  });

  test('pulses instead of filling when the total is unknown', () => {
    const component = renderBar({
      activities: [{ ...ACTIVITY, total: null }],
      href: '/health',
    });

    expect(component.getByRole('progressbar')).toHaveClass('animate-pulse');
  });
});
