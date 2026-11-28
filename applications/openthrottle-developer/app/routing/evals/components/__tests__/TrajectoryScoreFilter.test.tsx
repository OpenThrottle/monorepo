import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TrajectoryScoreFilter } from '../TrajectoryScoreFilter';

describe('TrajectoryScoreFilter Component', () => {
  test('links unscored, scored and all, in that order', () => {
    const component = renderEvals(
      <TrajectoryScoreFilter
        active="unscored"
        buildHref={(filter) => `/f/${filter}`}
      />,
    );

    expect(
      component.getAllByRole('link').map((link) => link.getAttribute('href')),
    ).toEqual(['/f/unscored', '/f/scored', '/f/all']);
  });

  test('marks the active filter current', () => {
    const component = renderEvals(
      <TrajectoryScoreFilter
        active="scored"
        buildHref={(filter) => `/f/${filter}`}
      />,
    );
    const links = component.getAllByRole('link');

    expect(links[1]).toHaveAttribute('aria-current', 'page');
    expect(links[0]).not.toHaveAttribute('aria-current');
  });
});
