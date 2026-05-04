import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SearchWhyThisResult } from '../SearchWhyThisResult';
import type { SearchChunk } from '~/__generated__/graphql';

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
});
