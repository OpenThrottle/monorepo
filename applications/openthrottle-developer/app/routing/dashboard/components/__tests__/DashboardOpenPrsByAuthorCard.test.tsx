import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  PRS_BY_AUTHOR_CHART_CONFIG,
  PRS_BY_AUTHOR_CHART_SERIES,
} from '~/routing/dashboard/utils/prs-by-author-chart';

import type { DashboardOpenPrsByAuthorCardProps } from '../DashboardOpenPrsByAuthorCard';
import { DashboardOpenPrsByAuthorCard } from '../DashboardOpenPrsByAuthorCard';

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
  const Component = () => {
    return <DashboardOpenPrsByAuthorCard {...cardProps} />;
  };
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
    const chartRoot = card.querySelector<HTMLElement>(
      '.recharts-responsive-container',
    );
    expect(chartRoot).not.toBeNull();

    // Declared values: jsdom resolves var() in computed custom properties, and
    // the theme tokens these point at are not loaded in tests.
    for (const seriesKey of PRS_BY_AUTHOR_CHART_SERIES) {
      const color = PRS_BY_AUTHOR_CHART_CONFIG[seriesKey]?.color;
      expect(chartRoot?.style.getPropertyValue(`--color-${seriesKey}`)).toBe(
        color,
      );
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
    const chartRoot = card.querySelector<HTMLElement>(
      '.recharts-responsive-container',
    );
    expect(chartRoot).toBeInTheDocument();
    expect(chartRoot?.style.getPropertyValue('--color-closed')).toBe(
      'var(--chart-2)',
    );
    expect(chartRoot?.style.getPropertyValue('--color-open')).toBe(
      'var(--chart-1)',
    );
  });
});
