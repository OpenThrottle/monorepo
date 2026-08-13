import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardContributionsCardSkeleton } from '../DashboardContributionsCardSkeleton';
import type { DashboardContributionsCardSkeletonProps } from '../DashboardContributionsCardSkeleton';

describe('DashboardContributionsCardSkeleton Component', () => {
  let component: RenderResult;
  let props: DashboardContributionsCardSkeletonProps;

  beforeEach(() => {
    props = {};
    component = render(<DashboardContributionsCardSkeleton {...props} />);
  });

  test('renders the skeleton card', () => {
    expect(
      component.getByTestId('DashboardContributionsCardSkeleton'),
    ).toBeInTheDocument();
  });

  test('marks the card busy for assistive tech', () => {
    expect(
      component.getByTestId('DashboardContributionsCardSkeleton'),
    ).toHaveAttribute('aria-busy', 'true');
  });

  test('applies a custom className to the card', () => {
    component.unmount();
    props = { className: 'custom-skeleton-class' };
    component = render(<DashboardContributionsCardSkeleton {...props} />);

    expect(
      component.getByTestId('DashboardContributionsCardSkeleton'),
    ).toHaveClass('custom-skeleton-class');
  });
});
