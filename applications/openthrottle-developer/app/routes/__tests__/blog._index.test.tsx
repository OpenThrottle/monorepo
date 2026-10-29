import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/blog._index';
import { BlogPostState } from '~/__generated__/graphql';
import {
  MOCK_AGENT_DRAFT,
  MOCK_HUMAN_DRAFT,
} from '~/routing/blog/data/mock.blog-posts';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';

import Component from '../blog._index';

type BlogIndexLoaderData = Route.ComponentProps['loaderData'];

const withPosts: BlogIndexLoaderData = {
  after: null,
  endCursor: 'cursor-2',
  hasNextPage: true,
  posts: [MOCK_HUMAN_DRAFT, MOCK_AGENT_DRAFT],
  search: null,
  state: BlogPostState.Draft,
};

const empty: BlogIndexLoaderData = {
  after: null,
  endCursor: null,
  hasNextPage: false,
  posts: [],
  search: null,
  state: BlogPostState.Live,
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/blog._index',
    loaderData: empty,
    params: {},
    pathname: '/blog',
  },
];

const renderBlog = (loaderData: BlogIndexLoaderData) =>
  renderRoutesStub(
    <Component
      actionData={undefined}
      loaderData={loaderData}
      matches={matches}
      params={{}}
    />,
  );

describe('routes/blog._index.tsx', () => {
  test('renders the heading, tabs, search and New post button', () => {
    const component = renderBlog(withPosts);

    expect(
      component.getByRole('heading', { level: 1, name: 'Blog' }),
    ).toBeInTheDocument();
    expect(component.getAllByRole('tab')).toHaveLength(4);
    expect(
      component.getByRole('searchbox', { name: 'Search posts' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'New post' }).closest('form'),
    ).toHaveAttribute('action', '/blog/new');
  });

  test('renders a row per post, flagging the agent-edited one', () => {
    const component = renderBlog(withPosts);

    expect(component.getAllByTestId('BlogPostRow')).toHaveLength(2);
    expect(component.getAllByTestId('BlogEditorBadge-agent')).toHaveLength(1);
  });

  test('offers the next page when the server has more', () => {
    const component = renderBlog(withPosts);

    expect(component.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/?after=cursor-2',
    );
  });

  test('renders the tab empty state instead of a table', () => {
    const component = renderBlog(empty);

    expect(component.queryByTestId('BlogPostsTable')).not.toBeInTheDocument();
    expect(component.getByText('No live posts yet')).toBeInTheDocument();
  });
});
