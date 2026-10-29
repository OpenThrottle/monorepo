import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostCoverFields } from '../BlogPostCoverFields';

describe('BlogPostCoverFields Component', () => {
  test('renders URL and alt inputs beside a thumbnail of the URL', () => {
    const component = renderWithProviders(
      <BlogPostCoverFields
        errors={{ coverImageAlt: 'Add alt text for the cover image.' }}
        onChange={vi.fn()}
        values={{ coverImageAlt: '', coverImageUrl: 'https://x.test/a.png' }}
      />,
    );

    expect(
      component.getByRole('textbox', { name: 'Cover image URL' }),
    ).toHaveValue('https://x.test/a.png');
    expect(
      component.getByRole('textbox', { name: 'Cover alt text' }),
    ).toHaveAccessibleDescription('Add alt text for the cover image.');
    expect(component.getByTestId('BlogPostCoverPreview')).toHaveAttribute(
      'src',
      'https://x.test/a.png',
    );
  });
});
