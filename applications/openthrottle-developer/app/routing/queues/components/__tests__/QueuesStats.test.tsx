import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesStats } from '../QueuesStats';
import type { QueuesStatsProps } from '../QueuesStats';

describe('QueuesStats Component', () => {
  let component: RenderResult;
  let props: QueuesStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueuesStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders stats region with title', () => {
    expect(component.getByTestId('QueuesStats')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'QueuesStats' }),
    ).toBeInTheDocument();
  });
});
