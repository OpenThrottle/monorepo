import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanConfigurationTabSkeleton } from '../PlanConfigurationTabSkeleton';
import type { PlanConfigurationTabSkeletonProps } from '../PlanConfigurationTabSkeleton';

describe('PlanConfigurationTabSkeleton Component', () => {
  let component: RenderResult;
  let props: PlanConfigurationTabSkeletonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanConfigurationTabSkeleton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  // The whole point of a skeleton: it paints with none of the data it stands in
  // for, so a pending region reads as loading rather than empty or broken.
  test('should render without the data it stands in for', () => {
    expect(
      component.getByTestId('PlanConfigurationTabSkeleton'),
    ).toBeInTheDocument();
  });

  test('should mark itself busy for assistive technology', () => {
    expect(
      component.getByTestId('PlanConfigurationTabSkeleton'),
    ).toHaveAttribute('aria-busy', 'true');
  });
});
