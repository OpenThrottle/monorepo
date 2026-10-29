import { act } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostCoverPreview } from '../BlogPostCoverPreview';

describe('BlogPostCoverPreview Component', () => {
  test('renders nothing without a URL', () => {
    const component = renderWithProviders(
      <BlogPostCoverPreview alt="" url="" />,
    );

    expect(component.queryByTestId('BlogPostCoverPreview')).toBeNull();
  });

  test('shows a thumbnail, then a warning when it fails to load', () => {
    const component = renderWithProviders(
      <BlogPostCoverPreview alt="A lighthouse" url="https://x.test/a.png" />,
    );
    const image = component.getByRole('img', { name: 'A lighthouse' });

    act(() => {
      image.dispatchEvent(new Event('error'));
    });

    expect(component.queryByRole('img')).not.toBeInTheDocument();
    expect(component.getByRole('alert')).toHaveTextContent(
      'This image could not be loaded',
    );
  });
});
