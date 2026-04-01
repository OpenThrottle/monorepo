import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SearchTaskCard } from '../SearchTaskCard';
import type { SearchTaskCardProps } from '../SearchTaskCard';
import type { SearchChunk } from '~/__generated__/graphql';

function mockSearchChunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    __typename: 'SearchChunk',
    content: 'Task chunk content',
    id: 'chunk-task-1',
    planId: null,
    planTitle: null,
    similarity: 0.88,
    source: 'task',
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

describe('SearchTaskCard Component', () => {
  let component: RenderResult;
  let props: SearchTaskCardProps;

  beforeEach(() => {
    props = {
      result: mockSearchChunk(),
    };

    const Component = () => <SearchTaskCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.getByTestId('SearchTaskCard')).toBeInTheDocument();
  });

  test('should show task title as fallback when result has no taskTitle', () => {
    expect(component.getByText('Task')).toBeInTheDocument();
  });

  test('should show task title when result has taskTitle', () => {
    props.result = mockSearchChunk({ taskTitle: 'Implement feature X' });

    const Component = () => <SearchTaskCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.getByText('Implement feature X')).toBeInTheDocument();
  });

  describe('when result has planId only', () => {
    beforeEach(() => {
      props.result = mockSearchChunk({
        planId: 'plan-123',
        planTitle: 'My Plan',
        taskId: null,
      });
      const Component = () => <SearchTaskCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show plan link without task link', () => {
      const planLink = component.getByTestId('SearchTaskCard-planLink');
      expect(planLink).toBeInTheDocument();
      expect(planLink).toHaveAttribute('href', '/plans/plan-123');
      expect(within(planLink).getByText('My Plan')).toBeInTheDocument();
      expect(
        component.queryByTestId('SearchTaskCard-taskLink'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when result has planId and taskId', () => {
    beforeEach(() => {
      props.result = mockSearchChunk({
        planId: 'plan-456',
        planTitle: 'Plan With Task',
        taskId: 'task-789',
        taskTitle: 'Polish SearchTaskCard',
      });
      const Component = () => <SearchTaskCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show plan link and task link', () => {
      const planLink = component.getByTestId('SearchTaskCard-planLink');
      expect(planLink).toHaveAttribute('href', '/plans/plan-456');
      expect(within(planLink).getByText('Plan With Task')).toBeInTheDocument();

      const taskLink = component.getByTestId('SearchTaskCard-taskLink');
      expect(taskLink).toBeInTheDocument();
      expect(taskLink).toHaveAttribute('href', '/plans/plan-456#task-task-789');
      expect(taskLink).toHaveTextContent('View task');
    });
  });

  test('should show content and relevance', () => {
    props.result = mockSearchChunk({
      content: 'Specific task content',
      similarity: 0.95,
    });
    const Component = () => <SearchTaskCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.getByText('Specific task content')).toBeInTheDocument();
    expect(
      component.getByTestId('SearchTaskCard-similarity'),
    ).toHaveTextContent('Relevance: 95%');
  });

  test('should show source badge', () => {
    props.result = mockSearchChunk({ source: 'task' });
    const Component = () => <SearchTaskCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByTestId('SearchTaskCard-sourceBadge'),
    ).toHaveTextContent('task');
  });
});
