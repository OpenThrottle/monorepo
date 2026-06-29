import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardOpenPrsByAuthorCard } from '../DashboardOpenPrsByAuthorCard';
import type { DashboardOpenPrsByAuthorCardProps } from '../DashboardOpenPrsByAuthorCard';
import {
  PRS_BY_AUTHOR_CHART_CONFIG,
  PRS_BY_AUTHOR_CHART_SERIES,
} from '~/routing/dashboard/utils/prs-by-author-chart';

const mockGithubStats = {
  closedPrCountByAuthor: [
    { author: 'visormatt', openCount: 1 },
    { author: 'other-user', openCount: 3 },
  ],
  openPrCountByAuthor: [
    { author: 'visormatt', openCount: 5 },
    { author: 'other-user', openCount: 2 },
  ],
};

function renderCard(
  cardProps: DashboardOpenPrsByAuthorCardProps,
): RenderResult {
  const Component = () => <DashboardOpenPrsByAuthorCard {...cardProps} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardOpenPrsByAuthorCard Component', () => {
  let component: RenderResult;
  let props: DashboardOpenPrsByAuthorCardProps;

  beforeEach(() => {
    props = {
      githubStats: mockGithubStats,
    };
    component = renderCard(props);
  });

  test('should render card with data-testid', () => {
    const card = component.getByTestId('DashboardOpenPrsByAuthorCard');
    expect(card).toBeInTheDocument();
  });

  test('should render Recharts responsive chart container', () => {
    const card = component.getByTestId('DashboardOpenPrsByAuthorCard');
    expect(
      card.querySelector('.recharts-responsive-container'),
    ).toBeInTheDocument();
  });

  test('should configure chart container CSS variables for each series', () => {
    const card = component.getByTestId('DashboardOpenPrsByAuthorCard');
    const chartRoot = card.querySelector('.recharts-responsive-container');
    expect(chartRoot).not.toBeNull();

    for (const seriesKey of PRS_BY_AUTHOR_CHART_SERIES) {
      const color = PRS_BY_AUTHOR_CHART_CONFIG[seriesKey]?.color;
      expect(chartRoot).toHaveStyle({ [`--color-${seriesKey}`]: color });
    }
  });

  test('should apply custom className to wrapper', () => {
    const customProps: DashboardOpenPrsByAuthorCardProps = {
      className: 'custom-class',
      githubStats: mockGithubStats,
    };
    const result = renderCard(customProps);
    const cards = result.getAllByTestId('DashboardOpenPrsByAuthorCard');
    const cardWithClass = cards.find((el) =>
      el.classList.contains('custom-class'),
    );
    expect(cardWithClass).toBeDefined();
    expect(cardWithClass).toHaveClass('custom-class');
  });
});

describe('DashboardOpenPrsByAuthorCard Component empty state', () => {
  test('should render empty message when both series are empty', () => {
    const result = renderCard({
      githubStats: {
        closedPrCountByAuthor: [],
        openPrCountByAuthor: [],
      },
    });
    expect(
      result.getByTestId('DashboardOpenPrsByAuthorCard'),
    ).toBeInTheDocument();
    expect(result.getByText(/No PRs by author/)).toBeInTheDocument();
    expect(
      result
        .getByTestId('DashboardOpenPrsByAuthorCard')
        .querySelector('.recharts-responsive-container'),
    ).not.toBeInTheDocument();
  });
});

describe('DashboardOpenPrsByAuthorCard Component partial series', () => {
  test('should render chart when only open series has authors', () => {
    const result = renderCard({
      githubStats: {
        closedPrCountByAuthor: [],
        openPrCountByAuthor: [{ author: 'solo', openCount: 4 }],
      },
    });
    const card = result.getByTestId('DashboardOpenPrsByAuthorCard');
    expect(
      card.querySelector('.recharts-responsive-container'),
    ).toBeInTheDocument();
    expect(result.queryByText(/No PRs by author/)).not.toBeInTheDocument();
  });

  test('should render chart when author appears only in closed series', () => {
    const result = renderCard({
      githubStats: {
        closedPrCountByAuthor: [{ author: 'closed-only', openCount: 2 }],
        openPrCountByAuthor: [],
      },
    });
    const card = result.getByTestId('DashboardOpenPrsByAuthorCard');
    const chartRoot = card.querySelector('.recharts-responsive-container');
    expect(chartRoot).toBeInTheDocument();
    expect(chartRoot).toHaveStyle({ '--color-closed': 'var(--chart-2)' });
    expect(chartRoot).toHaveStyle({ '--color-open': 'var(--chart-1)' });
  });
});
