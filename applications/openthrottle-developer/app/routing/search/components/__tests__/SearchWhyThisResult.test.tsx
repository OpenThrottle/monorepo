import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SearchWhyThisResult } from '../SearchWhyThisResult';
import type { SearchChunk } from '~/__generated__/graphql';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';

function mockChunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    __typename: 'SearchChunk',
    content: 'Snippet text',
    id: 'chunk-id-1',
    planId: 'plan-1',
    planTitle: 'Plan',
    similarity: 0.88,
    source: 'plan',
    sourcePath: null,
    sourceRepo: null,
    sourceSha: null,
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

describe('SearchWhyThisResult', () => {
  test('should expand details with chunk id and similarity explanation', async () => {
    const user = userEvent.setup();
    const chunk = mockChunk();
    const Component = () => <SearchWhyThisResult result={chunk} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const details = screen.getByTestId('SearchWhyThisResult');
    expect(details).toBeInTheDocument();
    expect(within(details).getByText(/Why this result\?/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Why this result\?/i));
    expect(screen.getByText(/Chunk id: chunk-id-1/)).toBeInTheDocument();
    expect(screen.getByText(/88%/, { exact: false })).toBeInTheDocument();
  });

  test('should start open when defaultOpen is true', () => {
    const chunk = mockChunk();
    const Component = () => (
      <SearchWhyThisResult defaultOpen={true} result={chunk} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const details = screen.getByTestId('SearchWhyThisResult');
    expect(details).toHaveAttribute('open');
  });

  test('should show rank summary and plan or task ids when provided', () => {
    const chunk = mockChunk({ planId: 'p-1', taskId: 't-1' });
    const rankMeta: SearchRankMeta = {
      indexOnPage: 0,
      page: 1,
      pageSize: 10,
      total: 3,
    };
    const Component = () => (
      <SearchWhyThisResult
        defaultOpen={true}
        rankMeta={rankMeta}
        result={chunk}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText(/Result 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/Plan id: p-1/)).toBeInTheDocument();
    expect(screen.getByText(/Task id: t-1/)).toBeInTheDocument();
  });

  test('should list documentation metadata when source is documentation', async () => {
    const user = userEvent.setup();
    const chunk = mockChunk({
      source: 'documentation',
      sourcePath: 'docs/foo.md',
      sourceRepo: 'visormatt/monorepo',
      sourceSha: 'abc1234567890',
    });
    const Component = () => <SearchWhyThisResult result={chunk} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    await user.click(screen.getByText(/Why this result\?/i));
    expect(screen.getByText(/Repo: visormatt\/monorepo/)).toBeInTheDocument();
    expect(screen.getByText(/Path: docs\/foo.md/)).toBeInTheDocument();
    expect(screen.getByText(/SHA: abc1234/)).toBeInTheDocument();
  });

  test('should surface quick open links for plan and task when ids exist', () => {
    const chunk = mockChunk({
      planId: 'plan-z',
      taskId: 'task-z',
      taskTitle: 'T',
    });
    const Component = () => (
      <SearchWhyThisResult defaultOpen={true} result={chunk} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const planLink = screen.getByTestId('SearchWhyThisResult-planJumpLink');
    expect(planLink).toHaveAttribute('href', '/plans/plan-z');

    const taskLink = screen.getByTestId('SearchWhyThisResult-taskJumpLink');
    expect(taskLink).toHaveAttribute('href', '/plans/plan-z#task-task-z');
  });

  test('should surface View on GitHub in quick open for documentation with repo and path', () => {
    const chunk = mockChunk({
      source: 'documentation',
      sourcePath: 'docs/foo.md',
      sourceRepo: 'org/repo',
      sourceSha: 'deadbeef',
    });
    const Component = () => (
      <SearchWhyThisResult defaultOpen={true} result={chunk} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const ext = screen.getByTestId('SearchWhyThisResult-docGithubLink');
    expect(ext).toHaveAttribute(
      'href',
      'https://github.com/org/repo/blob/deadbeef/docs/foo.md',
    );
  });
});
