import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { QueueHealthPill } from '../QueueHealthPill';
import type { QueueHealthPillProps } from '../QueueHealthPill';

const renderPill = (props: QueueHealthPillProps): RenderResult => {
  const Component = () => <QueueHealthPill {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueHealthPill Component', () => {
  test('reads healthy with no failures and a low backlog', () => {
    const component = renderPill({ failedCount: 0, waitingCount: 3 });

    const pill = component.getByTestId('QueueHealthPill');
    expect(pill).toHaveAttribute('data-health-level', 'healthy');
    expect(pill).toHaveTextContent('Healthy');
  });

  test('reads critical on sustained failures', () => {
    const component = renderPill({ failedCount: 40 });

    const pill = component.getByTestId('QueueHealthPill');
    expect(pill).toHaveAttribute('data-health-level', 'critical');
    expect(pill).toHaveTextContent('Critical');
  });

  test('hides the label but keeps the pill when showLabel is false', () => {
    const component = renderPill({ failedCount: 0, showLabel: false });

    const pill = component.getByTestId('QueueHealthPill');
    expect(pill).toBeInTheDocument();
    expect(pill).not.toHaveTextContent('Healthy');
    expect(pill).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Healthy'),
    );
  });
});
