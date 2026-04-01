import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardOpenPrsByAuthorCard } from '../DashboardOpenPrsByAuthorCard';
import type { DashboardOpenPrsByAuthorCardProps } from '../DashboardOpenPrsByAuthorCard';

const mockOpenPrCountByAuthor = [
  { author: 'visormatt', openCount: 5 },
  { author: 'other-user', openCount: 2 },
] as const;

describe('DashboardOpenPrsByAuthorCard Component', () => {
  let component: RenderResult;
  let props: DashboardOpenPrsByAuthorCardProps;

  beforeEach(() => {
    props = {
      openPrCountByAuthor: mockOpenPrCountByAuthor,
    };

    const Component = () => <DashboardOpenPrsByAuthorCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
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

  test('should apply custom className to wrapper', () => {
    const customProps: DashboardOpenPrsByAuthorCardProps = {
      className: 'custom-class',
      openPrCountByAuthor: mockOpenPrCountByAuthor,
    };
    const CustomComponent = () => (
      <DashboardOpenPrsByAuthorCard {...customProps} />
    );
    const RoutesStub = createRoutesStub([
      { Component: CustomComponent, path: '/' },
    ]);
    const result = render(<RoutesStub />);
    const cards = result.getAllByTestId('DashboardOpenPrsByAuthorCard');
    const cardWithClass = cards.find((el) =>
      el.classList.contains('custom-class'),
    );
    expect(cardWithClass).toBeDefined();
    expect(cardWithClass).toHaveClass('custom-class');
  });
});

describe('DashboardOpenPrsByAuthorCard Component empty state', () => {
  test('should render empty message when openPrCountByAuthor is empty', () => {
    const props: DashboardOpenPrsByAuthorCardProps = {
      openPrCountByAuthor: [],
    };
    const Component = () => <DashboardOpenPrsByAuthorCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const result = render(<RoutesStub />);
    expect(
      result.getByTestId('DashboardOpenPrsByAuthorCard'),
    ).toBeInTheDocument();
    expect(result.getByText(/No open PRs by author/)).toBeInTheDocument();
  });
});
