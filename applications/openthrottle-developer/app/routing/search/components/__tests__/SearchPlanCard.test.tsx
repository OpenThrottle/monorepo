import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SearchPlanCard } from '../SearchPlanCard';
import type { SearchPlanCardProps } from '../SearchPlanCard';
import type { SearchChunk } from '~/__generated__/graphql';

function mockSearchChunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    __typename: 'SearchChunk',
    content: 'Plan chunk content',
    id: 'chunk-plan-1',
    planId: null,
    planTitle: null,
    similarity: 0.85,
    source: 'plan',
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

describe('SearchPlanCard Component', () => {
  let component: RenderResult;
  let props: SearchPlanCardProps;

  beforeEach(() => {
    props = {
      result: mockSearchChunk(),
    };

    const Component = () => <SearchPlanCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.getByTestId('SearchPlanCard')).toBeInTheDocument();
  });

  test('should show plan title as plain text when result has no planId', () => {
    props.result = mockSearchChunk({
      planId: null,
      planTitle: 'Untitled Plan',
    });
    const Component = () => <SearchPlanCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.getByText('Untitled Plan')).toBeInTheDocument();
    expect(
      component.queryByTestId('SearchPlanCard-planLink'),
    ).not.toBeInTheDocument();
  });

  describe('when result has planId', () => {
    beforeEach(() => {
      props.result = mockSearchChunk({
        planId: 'plan-123',
        planTitle: 'My Plan',
      });
      const Component = () => <SearchPlanCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show plan link with title', () => {
      const link = component.getByTestId('SearchPlanCard-planLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/plans/plan-123');
      expect(within(link).getByText('My Plan')).toBeInTheDocument();
    });
  });

  test('should show content and relevance', () => {
    props.result = mockSearchChunk({
      content: 'Specific plan content',
      similarity: 0.92,
    });
    const Component = () => <SearchPlanCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.getByText('Specific plan content')).toBeInTheDocument();
    expect(
      component.getByTestId('SearchPlanCard-similarity'),
    ).toHaveTextContent('Relevance: 92%');
  });

  test('should show source badge', () => {
    props.result = mockSearchChunk({ source: 'plan' });
    const Component = () => <SearchPlanCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByTestId('SearchPlanCard-sourceBadge'),
    ).toHaveTextContent('plan');
  });
});
