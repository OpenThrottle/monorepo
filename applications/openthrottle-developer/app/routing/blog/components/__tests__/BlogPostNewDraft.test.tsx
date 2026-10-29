import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostNewDraft } from '../BlogPostNewDraft';

describe('BlogPostNewDraft Component', () => {
  test('offers a Create draft button', () => {
    const component = renderWithProviders(<BlogPostNewDraft error={null} />);

    expect(
      component.getByRole('button', { name: 'Create draft' }),
    ).toHaveAttribute('type', 'submit');
    expect(component.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('shows the last failure', () => {
    const component = renderWithProviders(
      <BlogPostNewDraft error="No free slug." />,
    );

    expect(component.getByRole('alert')).toHaveTextContent('No free slug.');
  });
});
