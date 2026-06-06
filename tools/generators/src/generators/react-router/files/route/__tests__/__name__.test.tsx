import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../<%= name %>';

describe('routes/<%= name %>.tsx', () => {
  test('renders page heading', () => {
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

    expect(view.getByRole('heading', { name: '<%= namePascal %>' })).toBeInTheDocument();
  });
});
