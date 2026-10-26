import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { MOCK_AGENT_DRAFT, MOCK_HUMAN_DRAFT } from '../../data/mock.blog-posts';
import { BlogPostsTable } from '../BlogPostsTable';

describe('BlogPostsTable Component', () => {
  test('renders the column headers and one row per post', () => {
    const component = renderRoutesStub(
      <BlogPostsTable posts={[MOCK_HUMAN_DRAFT, MOCK_AGENT_DRAFT]} />,
    );

    expect(
      component
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Title',
      'State',
      'Author',
      'Published',
      'Updated',
      'Edited by',
    ]);
    expect(component.getAllByTestId('BlogPostRow')).toHaveLength(2);
  });

  test('makes the agent-edited row distinguishable from the other', () => {
    const component = renderRoutesStub(
      <BlogPostsTable posts={[MOCK_HUMAN_DRAFT, MOCK_AGENT_DRAFT]} />,
    );

    expect(
      component
        .getAllByTestId('BlogPostRow')
        .map((row) => row.getAttribute('data-agent-edit')),
    ).toEqual(['false', 'true']);
  });

  test('renders dates with a visible time zone', () => {
    const component = renderRoutesStub(
      <BlogPostsTable posts={[MOCK_HUMAN_DRAFT]} />,
    );

    expect(component.getByTestId('BlogPostRow').textContent).toMatch(
      /Oct 20, 2026, .* [A-Z]{3,4}/,
    );
  });
});
