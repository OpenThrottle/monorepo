import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlansStats } from '../PlansStats';
import type { PlansStatsProps } from '../PlansStats';

describe('PlansStats Component', () => {
  let component: RenderResult;
  let props: PlansStatsProps;

  beforeEach(() => {
    props = {
      countCompleted: 12,
      countInProgress: 3,
      totalCount: 8,
      totalCountAll: 40,
      totalCountQueued: 2,
    };

    const Component = () => <PlansStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders three stat cards with configured titles', () => {
    expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(3);
    expect(component.getByText('In progress / Queued')).toBeInTheDocument();
    expect(component.getByText('Matching / Total plans')).toBeInTheDocument();
    expect(component.getByText('Completed (all)')).toBeInTheDocument();
  });
});
