import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesIntroduction } from '../QueuesIntroduction';
import type { QueuesIntroductionProps } from '../QueuesIntroduction';

describe('QueuesIntroduction Component', () => {
  let component: RenderResult;
  let props: QueuesIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueuesIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders page title and operational hint', () => {
    expect(
      component.getByRole('heading', { level: 1, name: 'Queues' }),
    ).toBeInTheDocument();
    const hint = component.getByTestId('queues-operational-hint');
    expect(hint).toHaveTextContent(/Worker queues \(BullMQ\)/);
    expect(hint).toHaveTextContent(/support bundle/);
  });
});
