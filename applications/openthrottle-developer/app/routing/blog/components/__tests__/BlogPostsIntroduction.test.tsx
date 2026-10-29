import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { BLOG_COPY } from '../../data/data.copy';
import { BlogPostsIntroduction } from '../BlogPostsIntroduction';

describe('BlogPostsIntroduction Component', () => {
  test('renders the page heading and description', () => {
    const component = renderRoutesStub(<BlogPostsIntroduction />);

    expect(
      component.getByRole('heading', { name: BLOG_COPY.pageTitle }),
    ).toBeInTheDocument();
    expect(component.getByText(BLOG_COPY.pageDescription)).toBeInTheDocument();
  });
});
