import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { SearchChunk } from '~/__generated__/graphql';
import { SEARCH_SOURCE_PILL_COLORS } from '~/routing/search/data/source-pills';

import { SearchCard } from '../SearchCard';

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

function renderCard(
  result: SearchChunk,
  onPreview: (result: SearchChunk) => void = vi.fn(),
): RenderResult {
  const Component = (): React.ReactElement => {
    return <SearchCard onPreview={onPreview} result={result} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
}

describe('SearchCard', () => {
  test('renders pill, title and meta in one header for every source', () => {
    const sources = ['plan', 'task', 'documentation'] as const;

    sources.forEach((source) => {
      const component = renderCard(
        mockSearchChunk({
          planId: 'plan-1',
          source,
          sourcePath: 'docs/a.md',
          sourceRepo: 'org/repo',
          taskId: 'task-1',
        }),
      );
      const card = component.getByTestId('SearchCard');
      const pill = component.getByTestId('SearchCard-pill');

      expect(card).toHaveAttribute('data-source', source);
      expect(pill).toHaveTextContent(source);
      expect(pill.parentElement).toBe(
        component.getByTestId('SearchCard-title').parentElement,
      );
      expect(component.getByTestId('SearchCard-meta')).toBeInTheDocument();
      expect(SEARCH_SOURCE_PILL_COLORS[source]).toBeDefined();
      component.unmount();
    });
  });

  describe('plan results', () => {
    test('link the title to the plan', () => {
      const component = renderCard(
        mockSearchChunk({ planId: 'plan-1', planTitle: 'My Plan' }),
      );
      const title = component.getByTestId('SearchCard-title');

      expect(title).toHaveAttribute('href', '/plans/plan-1');
      expect(title).toHaveTextContent('My Plan');
      expect(component.queryByTestId('SearchCard-context')).toBeNull();
    });

    test('render the title as text without a plan id', () => {
      const component = renderCard(mockSearchChunk({ planTitle: 'Orphan' }));

      expect(component.getByTestId('SearchCard-title').tagName).toBe('SPAN');
    });

    test('link a related task on the meta line', () => {
      const component = renderCard(
        mockSearchChunk({
          planId: 'plan-1',
          taskId: 'task-1',
          taskTitle: 'Related',
        }),
      );

      expect(component.getByTestId('SearchCard-context')).toHaveAttribute(
        'href',
        '/plans/plan-1#task-task-1',
      );
    });
  });

  describe('task results', () => {
    test('link the title to the task and the meta line to its plan', () => {
      const component = renderCard(
        mockSearchChunk({
          planId: 'plan-1',
          planTitle: 'Parent',
          source: 'task',
          taskId: 'task-1',
          taskTitle: 'Do it',
        }),
      );

      expect(component.getByTestId('SearchCard-title')).toHaveAttribute(
        'href',
        '/plans/plan-1#task-task-1',
      );
      expect(component.getByTestId('SearchCard-context')).toHaveAttribute(
        'href',
        '/plans/plan-1',
      );
    });

    test('render the title as text without plan and task ids', () => {
      const component = renderCard(mockSearchChunk({ source: 'task' }));

      expect(component.getByTestId('SearchCard-title').tagName).toBe('SPAN');
      expect(component.queryByTestId('SearchCard-context')).toBeNull();
    });
  });

  describe('documentation results', () => {
    test('link the title to the GitHub blob at the sha, falling back to main', () => {
      const withSha = renderCard(
        mockSearchChunk({
          source: 'documentation',
          sourcePath: 'docs/a.md',
          sourceRepo: 'org/repo',
          sourceSha: 'abc',
        }),
      );

      expect(withSha.getByTestId('SearchCard-title')).toHaveAttribute(
        'href',
        'https://github.com/org/repo/blob/abc/docs/a.md',
      );
      withSha.unmount();

      const onMain = renderCard(
        mockSearchChunk({
          source: 'documentation',
          sourcePath: 'docs/a.md',
          sourceRepo: 'org/repo',
        }),
      );

      expect(onMain.getByTestId('SearchCard-title')).toHaveAttribute(
        'href',
        'https://github.com/org/repo/blob/main/docs/a.md',
      );
    });

    test('render no blob link when the repo or path is missing', () => {
      const component = renderCard(
        mockSearchChunk({ source: 'documentation', sourcePath: 'docs/a.md' }),
      );

      expect(component.getByTestId('SearchCard-title').tagName).toBe('SPAN');
    });
  });

  test('shows relevance on the meta line', () => {
    const component = renderCard(mockSearchChunk({ similarity: 0.734 }));

    expect(component.getByTestId('SearchCard-relevance')).toHaveTextContent(
      '73%',
    );
  });

  test('renders the chunk content as a clamped snippet', () => {
    const component = renderCard(mockSearchChunk({ content: 'Body text' }));
    const snippet = component.getByTestId('SearchCard-content');

    expect(snippet).toHaveTextContent('Body text');
    expect(snippet).toHaveClass('line-clamp-3');
  });

  test('opens the preview from the snippet or the preview button', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const result = mockSearchChunk();
    const component = renderCard(result, onPreview);

    await user.click(component.getByTestId('SearchCard-content'));
    await user.click(component.getByTestId('SearchCard-preview'));

    expect(onPreview).toHaveBeenCalledTimes(2);
    expect(onPreview).toHaveBeenCalledWith(result, expect.any(HTMLElement));
  });

  test('opens the preview from the keyboard', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const component = renderCard(mockSearchChunk(), onPreview);

    component.getByTestId('SearchCard-content').focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onPreview).toHaveBeenCalledTimes(2);
  });

  test('keeps ranking details out of the card', () => {
    const component = renderCard(mockSearchChunk());

    expect(component.queryByTestId('SearchWhyThisResult')).toBeNull();
  });
});
