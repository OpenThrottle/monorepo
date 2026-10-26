import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { formatBlogScheduledFor } from '~/routing/blog/utils/formatters';
import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostScheduledFor } from '../BlogPostScheduledFor';

const ISO = '2026-11-01T17:00:00.000Z';

describe('BlogPostScheduledFor Component', () => {
  test('reads "Scheduled for <local date time> (<time zone>)"', () => {
    const component = renderWithProviders(
      <BlogPostScheduledFor publishedAt={ISO} />,
    );
    const text = component.getByTestId('BlogPostScheduledFor').textContent;

    expect(text).toBe(formatBlogScheduledFor(ISO, undefined));
    expect(text).toMatch(/^Scheduled for .+ \(.+\)$/);
  });
});
