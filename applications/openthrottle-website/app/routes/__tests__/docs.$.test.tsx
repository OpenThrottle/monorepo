import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../docs.$';

describe('routes/docs.$.tsx', () => {
  test('renders the doc page matching the splat path', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ description: null, title: 'Getting Started' }}
          matches={[] as never}
          params={{ '*': 'getting-started' }}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Getting Started' }),
    ).toBeInTheDocument();
  });
});
