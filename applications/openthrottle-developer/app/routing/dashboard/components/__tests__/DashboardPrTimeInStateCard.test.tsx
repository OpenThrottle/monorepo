import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardPrTimeInStateCard } from '../DashboardPrTimeInStateCard';
import type { DashboardPrTimeInStateCardProps } from '../DashboardPrTimeInStateCard';

const mockPrTimeInStateSummary = [
  { avgDaysInState: 2.5, count: 3, state: 'open' },
  { avgDaysInState: 1.0, count: 5, state: 'merged' },
] as const;

describe('DashboardPrTimeInStateCard Component', () => {
  let component: RenderResult;
  let props: DashboardPrTimeInStateCardProps;

  beforeEach(() => {
    props = {
      prTimeInStateSummary: mockPrTimeInStateSummary,
    };

    const Component = () => <DashboardPrTimeInStateCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render card with data-testid', () => {
    const card = component.getByTestId('DashboardPrTimeInStateCard');
    expect(card).toBeInTheDocument();
  });

  test('should render Recharts responsive chart container', () => {
    const card = component.getByTestId('DashboardPrTimeInStateCard');
    expect(
      card.querySelector('.recharts-responsive-container'),
    ).toBeInTheDocument();
  });

  test('should apply custom className to wrapper', () => {
    const customProps: DashboardPrTimeInStateCardProps = {
      className: 'custom-class',
      prTimeInStateSummary: mockPrTimeInStateSummary,
    };
    const CustomComponent = () => (
      <DashboardPrTimeInStateCard {...customProps} />
    );
    const RoutesStub = createRoutesStub([
      { Component: CustomComponent, path: '/' },
    ]);
    const result = render(<RoutesStub />);
    const cards = result.getAllByTestId('DashboardPrTimeInStateCard');
    const cardWithClass = cards.find((el) =>
      el.classList.contains('custom-class'),
    );
    expect(cardWithClass).toBeDefined();
    expect(cardWithClass).toHaveClass('custom-class');
  });
});

describe('DashboardPrTimeInStateCard Component empty state', () => {
  test('should render empty message when prTimeInStateSummary is empty', () => {
    const props: DashboardPrTimeInStateCardProps = {
      prTimeInStateSummary: [],
    };
    const Component = () => <DashboardPrTimeInStateCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const result = render(<RoutesStub />);
    expect(
      result.getByTestId('DashboardPrTimeInStateCard'),
    ).toBeInTheDocument();
    expect(result.getByText(/No PR time in state summary/)).toBeInTheDocument();
  });
});
