import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import type { DashboardPrCardsSkeletonProps } from '../DashboardPrCardsSkeleton';
import { DashboardPrCardsSkeleton } from '../DashboardPrCardsSkeleton';

describe('DashboardPrCardsSkeleton Component', () => {
  let component: RenderResult;
  let props: DashboardPrCardsSkeletonProps;

  beforeEach(() => {
    props = {};
    component = render(<DashboardPrCardsSkeleton {...props} />);
  });

  test('renders the busy placeholder', () => {
    const skeleton = component.getByTestId('DashboardPrCardsSkeleton');

    expect(skeleton).toBeTruthy();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  test('merges a custom className onto the container', () => {
    component.unmount();
    component = render(<DashboardPrCardsSkeleton className="custom-class" />);

    expect(component.getByTestId('DashboardPrCardsSkeleton')).toHaveClass(
      'custom-class',
    );
  });
});
