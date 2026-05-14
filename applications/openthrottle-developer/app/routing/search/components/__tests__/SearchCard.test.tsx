import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SearchCard } from '../SearchCard';
import type { SearchCardProps } from '../SearchCard';
import type { SearchChunk } from '~/__generated__/graphql';

function mockSearchChunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    __typename: 'SearchChunk',
    content: 'Chunk content',
    id: 'chunk-1',
    planId: null,
    planTitle: null,
    similarity: 0.9,
    source: 'plan',
    sourcePath: null,
    sourceRepo: null,
    sourceSha: null,
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

describe('SearchCard Component', () => {
  let component: RenderResult;
  let props: SearchCardProps;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = {
      result: mockSearchChunk(),
    };

    const Component = () => <SearchCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should delegate to SearchPlanCard for plan source and render with data-testid', () => {
    const card = component.getByTestId('SearchPlanCard');

    expect(card).toBeInTheDocument();
  });

  test('should show plan title as plain text when result has no planId', () => {
    cleanup();
    props.result = mockSearchChunk({
      planId: null,
      planTitle: 'Untitled Plan',
      source: 'plan',
    });
    const Component = () => <SearchCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    expect(view.getByTestId('SearchPlanCard')).toBeInTheDocument();
    expect(
      view.queryByTestId('SearchPlanCard-planLink'),
    ).not.toBeInTheDocument();
    const heading = view.getByRole('heading', {
      level: 3,
      name: 'Untitled Plan',
    });
    expect(heading).toBeInTheDocument();
  });

  describe('when result has planId', () => {
    beforeEach(() => {
      cleanup();
      props.result = mockSearchChunk({
        planId: 'plan-123',
        planTitle: 'My Plan',
        source: 'plan',
      });
      const Component = () => <SearchCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('should render plan link via SearchPlanCard with correct href and data-testid', () => {
      const planLink = component.getByTestId('SearchPlanCard-planLink');
      expect(planLink).toBeInTheDocument();
      expect(planLink).toHaveAttribute('href', '/plans/plan-123');
      expect(planLink).toHaveTextContent('My Plan');
    });

    test('should not render task link when taskId is absent', () => {
      expect(
        component.queryByTestId('SearchTaskCard-taskLink'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when result has planId and taskId (task source)', () => {
    beforeEach(() => {
      cleanup();
      props.result = mockSearchChunk({
        planId: 'plan-456',
        planTitle: 'Plan With Task',
        source: 'task',
        taskId: 'task-789',
        taskTitle: 'A task',
      });
      const Component = () => <SearchCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('should delegate to SearchTaskCard and render plan link and task link', () => {
      const planLink = component.getByTestId('SearchTaskCard-planLink');
      expect(planLink).toHaveAttribute('href', '/plans/plan-456');
      expect(planLink).toHaveTextContent('Plan With Task');

      const taskLink = component.getByTestId('SearchTaskCard-taskLink');
      expect(taskLink).toBeInTheDocument();
      expect(taskLink).toHaveAttribute('href', '/plans/plan-456#task-task-789');
      expect(taskLink).toHaveTextContent('View task');
    });

    test('should match snapshot for task card with plan + task links', () => {
      expect(component.baseElement).toMatchSnapshot();
    });
  });

  describe('when source is documentation', () => {
    beforeEach(() => {
      cleanup();
      props.result = mockSearchChunk({
        content: 'Docs chunk content',
        planId: null,
        planTitle: null,
        source: 'documentation',
        taskId: null,
        taskTitle: null,
      });
      const Component = () => <SearchCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('should delegate to SearchDocumentationCard with source badge and content only', () => {
      expect(
        component.getByTestId('SearchDocumentationCard'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SearchDocumentationCard-sourceBadge'),
      ).toHaveTextContent('documentation');
      expect(component.getByText('Docs chunk content')).toBeInTheDocument();
      expect(
        component.queryByTestId('SearchPlanCard-planLink'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('SearchTaskCard-taskLink'),
      ).not.toBeInTheDocument();
    });

    test('should not render blob link when sourceRepo or sourcePath is missing', () => {
      expect(
        component.queryByTestId('SearchDocumentationCard-blobLink'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when source is documentation with sourceRepo and sourcePath', () => {
    beforeEach(() => {
      cleanup();
      props.result = mockSearchChunk({
        content: 'Docs chunk content',
        planId: null,
        planTitle: null,
        source: 'documentation',
        sourcePath: 'docs/openthrottle/desktop-notifications-testing.md',
        sourceRepo: 'visormatt/monorepo',
        sourceSha: null,
        taskId: null,
        taskTitle: null,
      });
      const Component = () => <SearchCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('should delegate to SearchDocumentationCard with blob link (main when sourceSha absent)', () => {
      const link = component.getByTestId('SearchDocumentationCard-blobLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/visormatt/monorepo/blob/main/docs/openthrottle/desktop-notifications-testing.md',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(
        component.getByTestId('SearchDocumentationCard-sourceBadge'),
      ).toHaveTextContent('documentation');
    });

    test('should use sourceSha in blob URL when present', () => {
      cleanup();
      props.result = mockSearchChunk({
        content: 'Docs chunk content',
        planId: null,
        planTitle: null,
        source: 'documentation',
        sourcePath: 'docs/foo.md',
        sourceRepo: 'owner/repo',
        sourceSha: 'abc123def',
        taskId: null,
        taskTitle: null,
      });
      const Component = () => <SearchCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const view = render(<RoutesStub />);
      const link = view.getByTestId('SearchDocumentationCard-blobLink');
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/owner/repo/blob/abc123def/docs/foo.md',
      );
    });
  });

  test('should render card content from result.content via delegated card', () => {
    cleanup();
    props.result = mockSearchChunk({
      content: 'Snippet of plan or task text.',
    });
    const Component = () => <SearchCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    const card = view.getByTestId('SearchPlanCard');
    expect(
      within(card).getByText('Snippet of plan or task text.'),
    ).toBeInTheDocument();
  });
});
