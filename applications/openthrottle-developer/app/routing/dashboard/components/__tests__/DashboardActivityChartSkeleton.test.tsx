import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardActivityChartSkeleton } from '../DashboardActivityChartSkeleton';
import type { DashboardActivityChartSkeletonProps } from '../DashboardActivityChartSkeleton';

describe('DashboardActivityChartSkeleton Component', () => {
  let component: RenderResult;
  let props: DashboardActivityChartSkeletonProps;

  beforeEach(() => {
    props = {};
    component = render(<DashboardActivityChartSkeleton {...props} />);
  });

  test('renders the skeleton container with aria-busy', () => {
    const element = component.getByTestId('DashboardActivityChartSkeleton');

    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('aria-busy', 'true');
  });

  test('applies an additional className alongside the defaults', () => {
    component.unmount();
    props = { className: 'custom-class' };
    component = render(<DashboardActivityChartSkeleton {...props} />);

    expect(component.getByTestId('DashboardActivityChartSkeleton')).toHaveClass(
      'custom-class',
      'mt-4',
      'w-full',
    );
  });
});
