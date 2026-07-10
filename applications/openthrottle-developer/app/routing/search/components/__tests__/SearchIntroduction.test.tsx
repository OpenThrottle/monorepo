import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SearchIntroduction } from '../SearchIntroduction';
import type { SearchIntroductionProps } from '../SearchIntroduction';

describe('SearchIntroduction Component', () => {
  let component: RenderResult;
  let props: SearchIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SearchIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders search page title', () => {
    expect(
      component.getByRole('heading', { level: 1, name: 'Search' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('SearchIntroduction')).toBeInTheDocument();
  });

  test('renders empty-state hint when hasQuery is false', () => {
    expect(
      component.getByText(/Enter a query below for semantic search/i),
    ).toBeInTheDocument();
  });

  test('renders power-user controls when hasQuery and handler are set', () => {
    const onExpandRankingChange = vi.fn();
    props = {
      expandRankingDetails: true,
      hasQuery: true,
      onExpandRankingChange,
    };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <SearchIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(
      component.getByLabelText('Expand ranking details on all results'),
    ).toBeChecked();
    expect(
      component.getByText(/Power user: expand ranking details/i),
    ).toBeInTheDocument();
  });
});
