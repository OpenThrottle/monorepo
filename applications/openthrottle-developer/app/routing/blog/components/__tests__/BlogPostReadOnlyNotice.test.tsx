import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostReadOnlyNotice } from '../BlogPostReadOnlyNotice';

describe('BlogPostReadOnlyNotice Component', () => {
  test('explains that only an admin can edit a published post', () => {
    const component = renderWithProviders(<BlogPostReadOnlyNotice />);

    expect(component.getByRole('status')).toHaveTextContent(
      'Only an admin can edit a published post',
    );
  });
});
