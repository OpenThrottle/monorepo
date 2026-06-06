import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../generators._index';

describe('routes/generators._index.tsx', () => {
  test('renders generators heading and documentation links', () => {
    const view = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={{ generators: [] }}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { name: 'Generators' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('link', { name: /AGENT_USAGE/i }),
    ).toBeInTheDocument();
  });
});
