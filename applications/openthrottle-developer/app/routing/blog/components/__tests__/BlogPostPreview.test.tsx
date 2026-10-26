import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostPreview } from '../BlogPostPreview';

const values = {
  bodyMarkdown: '## Getting started\n\nSome **bold** text.\n\n- one\n- two',
  coverImageAlt: 'A lighthouse',
  coverImageUrl: 'https://x.test/cover.png',
  excerpt: 'Why we built it.',
  title: 'Launch notes',
};

describe('BlogPostPreview Component', () => {
  test('renders the Markdown body', () => {
    const component = renderWithProviders(<BlogPostPreview values={values} />);

    expect(
      component.getByRole('heading', { level: 2, name: 'Getting started' }),
    ).toBeInTheDocument();
    expect(component.getByText('bold').tagName).toBe('STRONG');
    expect(component.getAllByRole('listitem')).toHaveLength(2);
  });

  test('renders the header: cover, title and excerpt', () => {
    const component = renderWithProviders(<BlogPostPreview values={values} />);

    expect(
      component.getByRole('img', { name: 'A lighthouse' }),
    ).toHaveAttribute('src', 'https://x.test/cover.png');
    expect(
      component.getByRole('heading', { level: 2, name: 'Launch notes' }),
    ).toBeInTheDocument();
    expect(component.getByText('Why we built it.')).toBeInTheDocument();
  });

  test('prompts for content when the body is empty', () => {
    const component = renderWithProviders(
      <BlogPostPreview values={{ ...values, bodyMarkdown: '  ' }} />,
    );

    expect(component.queryByTestId('MarkdownRenderer')).not.toBeInTheDocument();
    expect(component.getByText(/Start writing/)).toBeInTheDocument();
  });
});
