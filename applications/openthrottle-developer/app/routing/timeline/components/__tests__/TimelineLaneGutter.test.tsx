import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TimelineLaneGutter } from '../TimelineLaneGutter';
import type { TimelineLaneGutterProps } from '../TimelineLaneGutter';
import type { TimelineLane } from '~/routing/timeline/types';

const lanes: readonly TimelineLane[] = [
  {
    key: 'plan:plan-1',
    label: 'Beta /timeline',
    markerClusters: [],
    spans: [],
    subRowCount: 3,
  },
  {
    key: 'skills',
    label: 'Skills',
    markerClusters: [],
    spans: [],
    subRowCount: 1,
  },
];

const baseProps: TimelineLaneGutterProps = {
  laneRowHeight: 28,
  lanes,
  offsetTop: 28,
};

const renderGutter = (props: TimelineLaneGutterProps): RenderResult => {
  const Component = () => <TimelineLaneGutter {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineLaneGutter Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderGutter(baseProps);
  });

  test('should render the gutter', () => {
    expect(component.getByTestId('TimelineLaneGutter')).toBeInTheDocument();
  });

  test('should render one label per lane', () => {
    expect(component.getAllByTestId('TimelineLaneGutterLane')).toHaveLength(2);
  });

  test('should stay put while the chart body scrolls', () => {
    expect(component.getByTestId('TimelineLaneGutter')).toHaveClass('sticky');
  });

  test('should size a lane by its sub-row count so labels line up', () => {
    const [first, second] = component.getAllByTestId('TimelineLaneGutterLane');

    expect(first).toHaveStyle({ height: '84px' });
    expect(second).toHaveStyle({ height: '28px' });
  });

  test('should expose the full label as a title for a truncated lane', () => {
    expect(
      component.getAllByTestId('TimelineLaneGutterLane')[0],
    ).toHaveAttribute('title', 'Beta /timeline');
  });
});
