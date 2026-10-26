import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { BLOG_EMPTY_COPY, BLOG_ONBOARDING } from '../../data/data.copy';
import { BlogPostsEmpty } from '../BlogPostsEmpty';

describe('BlogPostsEmpty Component', () => {
  test('shows the onboarding pitch for an empty Drafts tab', () => {
    const component = renderRoutesStub(
      <BlogPostsEmpty search={null} state={BlogPostState.Draft} />,
    );

    expect(
      component.getByTestId('BlogPostsEmpty-onboarding'),
    ).toHaveTextContent(BLOG_ONBOARDING.tagline);
  });

  test.each([
    BlogPostState.Scheduled,
    BlogPostState.Live,
    BlogPostState.Archived,
  ])('shows tab-specific copy for an empty %s tab', (state) => {
    const component = renderRoutesStub(
      <BlogPostsEmpty search={null} state={state} />,
    );
    const copy = BLOG_EMPTY_COPY[state];

    expect(component.getByText(copy.title)).toBeInTheDocument();
    expect(component.getByText(copy.description)).toBeInTheDocument();
  });

  test('offers to clear a search that matched nothing, on any tab', () => {
    const component = renderRoutesStub(
      <BlogPostsEmpty search="zzz" state={BlogPostState.Draft} />,
    );

    expect(
      component.getByText('No posts match your search'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Clear search' }),
    ).toBeInTheDocument();
  });
});
