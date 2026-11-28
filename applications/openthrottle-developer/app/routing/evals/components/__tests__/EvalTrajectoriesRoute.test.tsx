import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { EVAL_TRAJECTORIES_COPY } from '~/routing/evals/data/copy';
import { MOCK_PLAN_GROUP_PAGE } from '~/routing/evals/data/mock.trajectory-plan-groups';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

import type { EvalTrajectoriesRouteProps } from '../EvalTrajectoriesRoute';
import { EvalTrajectoriesRoute } from '../EvalTrajectoriesRoute';

const PROPS: EvalTrajectoriesRouteProps = {
  filter: 'unscored',
  page: MOCK_PLAN_GROUP_PAGE,
  repositories: [{ displayName: 'monorepo', id: 'repo-1' }],
  selectedRepositoryId: null,
};

describe('EvalTrajectoriesRoute Component', () => {
  describe('with plan groups', () => {
    test('renders the tabs, filters, every group and load more', () => {
      const component = renderEvals(<EvalTrajectoriesRoute {...PROPS} />);

      expect(component.getByTestId('EvalsTabs')).toBeInTheDocument();
      expect(component.getByTestId('EvalRepositoryPicker')).toBeInTheDocument();
      expect(
        component.getByTestId('TrajectoryScoreFilter'),
      ).toBeInTheDocument();
      expect(component.getAllByTestId('TrajectoryPlanGroup')).toHaveLength(2);
      expect(component.queryByTestId('EvalTrajectoriesEmpty')).toBeNull();
      expect(
        component.getByRole('button', {
          name: EVAL_TRAJECTORIES_COPY.loadMore,
        }),
      ).toBeEnabled();
    });

    test("offers Start scoring at a group's first unscored trajectory", () => {
      const component = renderEvals(<EvalTrajectoriesRoute {...PROPS} />);

      const links = component.getAllByRole('link', {
        name: EVAL_TRAJECTORIES_COPY.startScoring,
      });

      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/evals/trajectories/trajectory-plan-1',
        '/evals/trajectories/trajectory-gone-1',
      ]);
    });

    test('keeps the selected repository in the filter links', () => {
      const component = renderEvals(
        <EvalTrajectoriesRoute {...PROPS} selectedRepositoryId="repo-1" />,
      );
      const filterLinks = component
        .getByTestId('TrajectoryScoreFilter')
        .querySelectorAll('a');

      expect(
        Array.from(filterLinks).map((link) => link.getAttribute('href')),
      ).toEqual([
        '/evals/trajectories?repositoryId=repo-1',
        '/evals/trajectories?score=scored&repositoryId=repo-1',
        '/evals/trajectories?score=all&repositoryId=repo-1',
      ]);
    });
  });

  describe('on the last page', () => {
    test('offers no load more', () => {
      const component = renderEvals(
        <EvalTrajectoriesRoute
          {...PROPS}
          page={{ ...MOCK_PLAN_GROUP_PAGE, hasNextPage: false }}
        />,
      );

      expect(
        component.queryByRole('button', {
          name: EVAL_TRAJECTORIES_COPY.loadMore,
        }),
      ).toBeNull();
    });
  });

  describe('with no plan groups', () => {
    test('shows the empty state', () => {
      const component = renderEvals(
        <EvalTrajectoriesRoute
          {...PROPS}
          page={{ endCursor: null, groups: [], hasNextPage: false }}
        />,
      );

      expect(
        component.getByTestId('EvalTrajectoriesEmpty'),
      ).toBeInTheDocument();
      expect(component.queryAllByTestId('TrajectoryPlanGroup')).toHaveLength(0);
    });
  });
});
