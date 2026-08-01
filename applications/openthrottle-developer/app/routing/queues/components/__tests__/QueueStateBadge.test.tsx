import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { QueueStateBadge } from '../QueueStateBadge';
import type { QueueStateBadgeProps } from '../QueueStateBadge';

const renderBadge = (props: QueueStateBadgeProps): RenderResult => {
  const Component = () => <QueueStateBadge {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueStateBadge Component', () => {
  test('renders a human-readable label for a canonical state', () => {
    const component = renderBadge({ state: 'failed' });

    expect(component.getByTestId('QueueStateBadge')).toHaveTextContent(
      'Failed',
    );
  });

  test('renders the compound waiting-children label', () => {
    const component = renderBadge({ state: 'waiting-children' });

    expect(component.getByTestId('QueueStateBadge')).toHaveTextContent(
      'Waiting on children',
    );
  });

  test('renders unknown states verbatim', () => {
    const component = renderBadge({ state: 'mystery' });

    expect(component.getByTestId('QueueStateBadge')).toHaveTextContent(
      'mystery',
    );
  });

  test('honors a custom data-testid', () => {
    const component = renderBadge({
      'data-testid': 'job-state-1',
      state: 'active',
    });

    expect(component.getByTestId('job-state-1')).toBeInTheDocument();
  });
});
