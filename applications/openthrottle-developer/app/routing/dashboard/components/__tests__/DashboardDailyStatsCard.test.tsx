import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardDailyStatsCard } from '../DashboardDailyStatsCard';
import type { DashboardDailyStatsCardProps } from '../DashboardDailyStatsCard';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

const twoDayStats: ReadonlyArray<DashboardDailyStatsCardFragment> = [
  {
    date: '2026-01-01',
    plansCompleted: 1,
    plansCreated: 2,
    plansUpdated: 0,
    tasksCompleted: 1,
    tasksCreated: 3,
    tasksUpdated: 1,
  },
  {
    date: '2026-01-02',
    plansCompleted: 0,
    plansCreated: 1,
    plansUpdated: 1,
    tasksCompleted: 2,
    tasksCreated: 0,
    tasksUpdated: 0,
  },
];

describe('DashboardDailyStatsCard Component', () => {
  let component: RenderResult;
  let props: DashboardDailyStatsCardProps;

  beforeEach(() => {
    props = {
      dailyStats: [...twoDayStats],
    };

    const Component = () => <DashboardDailyStatsCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have chart container and data-testid', () => {
    const card = component.getByTestId('DashboardDailyStatsCard');
    expect(card).toBeInTheDocument();
  });

  test('should render chart when given single day of stats', () => {
    const singleDayProps: DashboardDailyStatsCardProps = {
      dailyStats: [twoDayStats[0]!],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <DashboardDailyStatsCard {...singleDayProps} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const result = render(<RoutesStub />);
    const cards = result.getAllByTestId('DashboardDailyStatsCard');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(
      result.queryByText(/No daily stats in range/),
    ).not.toBeInTheDocument();
  });

  test('should render Recharts chart container when dailyStats has items', () => {
    const card = component.getByTestId('DashboardDailyStatsCard');
    const chartContainer = card.querySelector('.recharts-responsive-container');
    expect(chartContainer).toBeInTheDocument();
  });

  test('should apply custom className to card wrapper', () => {
    const customProps: DashboardDailyStatsCardProps = {
      className: 'custom-class',
      dailyStats: [...twoDayStats],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const CustomComponent = () => <DashboardDailyStatsCard {...customProps} />;
    const RoutesStub = createRoutesStub([
      { Component: CustomComponent, path: '/' },
    ]);
    const result = render(<RoutesStub />);
    const cards = result.getAllByTestId('DashboardDailyStatsCard');
    const cardWithClass = cards.find((el) =>
      el.classList.contains('custom-class'),
    );
    expect(cardWithClass).toBeDefined();
    expect(cardWithClass).toHaveClass('custom-class');
  });
});

describe('DashboardDailyStatsCard Component interactivity', () => {
  function renderCard(props: DashboardDailyStatsCardProps): RenderResult {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <DashboardDailyStatsCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  }

  test('applies a clickable affordance when onSelectDate is provided', () => {
    const result = renderCard({
      dailyStats: [...twoDayStats],
      onSelectDate: () => undefined,
    });
    const card = result.getByTestId('DashboardDailyStatsCard');
    expect(card.querySelector('.cursor-pointer')).not.toBeNull();
  });

  test('omits the clickable affordance when onSelectDate is absent', () => {
    const result = renderCard({ dailyStats: [...twoDayStats] });
    const card = result.getByTestId('DashboardDailyStatsCard');
    expect(card.querySelector('.cursor-pointer')).toBeNull();
  });
});

describe('DashboardDailyStatsCard Component empty state', () => {
  test('should render empty message when dailyStats is empty', () => {
    const props: DashboardDailyStatsCardProps = {
      dailyStats: [],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <DashboardDailyStatsCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const result = render(<RoutesStub />);
    expect(result.getByTestId('DashboardDailyStatsCard')).toBeInTheDocument();
    expect(result.getByText(/No daily stats in range/)).toBeInTheDocument();
  });
});
