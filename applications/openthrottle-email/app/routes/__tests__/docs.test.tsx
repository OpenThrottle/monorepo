import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../docs';

describe('routes/docs.tsx', () => {
  test('renders the docs sidebar nav from docs-content', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Getting Started' })).toHaveAttribute(
      'href',
      '/docs/getting-started',
    );
  });
});
