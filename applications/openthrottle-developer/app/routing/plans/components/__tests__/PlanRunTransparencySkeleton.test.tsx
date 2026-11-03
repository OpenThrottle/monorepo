import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_ROWS } from '~/routing/plans/data/data.plan-run-transparency-skeleton';

import type { PlanRunTransparencySkeletonProps } from '../PlanRunTransparencySkeleton';
import { PlanRunTransparencySkeleton } from '../PlanRunTransparencySkeleton';

describe('PlanRunTransparencySkeleton Component', () => {
  let component: RenderResult;
  let props: PlanRunTransparencySkeletonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanRunTransparencySkeleton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  // The whole point of a skeleton: it paints with none of the data it stands in
  // for, so a pending region reads as loading rather than empty or broken.
  test('should render without the data it stands in for', () => {
    expect(
      component.getByTestId('PlanRunTransparencySkeleton'),
    ).toBeInTheDocument();
  });

  test('should mark itself busy for assistive technology', () => {
    expect(
      component.getByTestId('PlanRunTransparencySkeleton'),
    ).toHaveAttribute('aria-busy', 'true');
  });

  // Mirrors the populated "Runs" card's section order so the tab does not jump.
  test('should draw the run sections in the populated card order', () => {
    const root = component.getByTestId('PlanRunTransparencySkeleton');
    const sectionIds = Array.from(
      root.querySelectorAll('[data-testid^="PlanRunTransparencySkeleton-"]'),
    ).map((element) => element.getAttribute('data-testid'));

    expect(sectionIds).toEqual([
      'PlanRunTransparencySkeleton-upcoming',
      'PlanRunTransparencySkeleton-latest',
      'PlanRunTransparencySkeleton-history',
      'PlanRunTransparencySkeleton-cli',
    ]);
  });

  test('should draw a history header plus one placeholder per data row', () => {
    const history = component.getByTestId(
      'PlanRunTransparencySkeleton-history',
    );
    const rows = history.querySelectorAll('.divide-y > div');

    expect(rows).toHaveLength(
      PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_ROWS.length + 1,
    );
  });
});
