import { describe, expect, test } from 'vitest';

import { SEARCH_RESULT_COPY } from '~/routing/search/data/data.copy';
import type { SearchChunk } from '~/routing/search/utils/toSearchResultView';

import { toSearchResultView } from '../toSearchResultView';

function chunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    content: 'c',
    id: 'id',
    planId: null,
    planTitle: null,
    similarity: 0.5,
    source: 'plan',
    sourcePath: null,
    sourceRepo: null,
    sourceSha: null,
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

describe('toSearchResultView', () => {
  test('plan: title links to the plan; a related task becomes the context', () => {
    const view = toSearchResultView(
      chunk({ planId: 'p', planTitle: 'P', taskId: 't', taskTitle: 'T' }),
    );

    expect(view.target).toEqual({ href: '/plans/p', kind: 'internal' });
    expect(view.context).toEqual({
      label: 'T',
      target: { href: '/plans/p#task-t', kind: 'internal' },
    });
    expect(view.relevancePercent).toBe(50);
  });

  test('plan: no plan id means no link and fallback title', () => {
    const view = toSearchResultView(chunk());

    expect(view.target).toEqual({ kind: 'none' });
    expect(view.title).toBe(SEARCH_RESULT_COPY.fallbackTitle.plan);
    expect(view.context).toBeNull();
  });

  test('task: title links to the task anchor; the plan is the context', () => {
    const view = toSearchResultView(
      chunk({ planId: 'p', planTitle: 'P', source: 'task', taskId: 't' }),
    );

    expect(view.title).toBe(SEARCH_RESULT_COPY.fallbackTitle.task);
    expect(view.target).toEqual({ href: '/plans/p#task-t', kind: 'internal' });
    expect(view.context?.target).toEqual({
      href: '/plans/p',
      kind: 'internal',
    });
  });

  test('documentation: title is the path, linked externally; repo is the context', () => {
    const view = toSearchResultView(
      chunk({
        source: 'documentation',
        sourcePath: 'docs/a.md',
        sourceRepo: 'o/r',
      }),
    );

    expect(view.title).toBe('docs/a.md');
    expect(view.target).toEqual({
      href: 'https://github.com/o/r/blob/main/docs/a.md',
      kind: 'external',
    });
    expect(view.context?.label).toBe('o/r');
  });

  test('documentation: without a repo there is no link and no context', () => {
    const view = toSearchResultView(chunk({ source: 'documentation' }));

    expect(view.target).toEqual({ kind: 'none' });
    expect(view.context).toBeNull();
  });

  test('drops a leading copy of the title from the snippet', () => {
    const view = toSearchResultView(
      chunk({ content: 'P  the body', planId: 'p', planTitle: 'P' }),
    );

    expect(view.snippet).toBe('the body');
  });

  test('keeps content that does not start with the title', () => {
    const view = toSearchResultView(
      chunk({ content: 'the body', planTitle: 'P' }),
    );

    expect(view.snippet).toBe('the body');
  });
});
