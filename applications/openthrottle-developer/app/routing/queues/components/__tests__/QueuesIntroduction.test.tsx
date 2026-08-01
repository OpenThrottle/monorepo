import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { QueuesIntroduction } from '../QueuesIntroduction';
import type { QueuesIntroductionProps } from '../QueuesIntroduction';

const renderIntroduction = (props: QueuesIntroductionProps): RenderResult => {
  const Component = () => <QueuesIntroduction {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueuesIntroduction Component', () => {
  test('renders the page title and an honest, jargon-free description', () => {
    const component = renderIntroduction({});

    expect(
      component.getByRole('heading', { level: 1, name: 'Queues' }),
    ).toBeInTheDocument();
    const hint = component.getByTestId('queues-operational-hint');
    expect(hint).toHaveTextContent(/background worker queues/i);
    // No leaked GraphQL operation names in user-facing copy.
    expect(hint.textContent ?? '').not.toMatch(/retryJob|cancelPlanRun/);
  });

  test('renders the ops toolbar with search and a create-queue action', () => {
    const component = renderIntroduction({});

    expect(component.getByTestId('QueueOpsToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('searchbox', { name: 'Search queues' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /Create queue/i }),
    ).toHaveAttribute('href', '/queues/create');
  });
});
