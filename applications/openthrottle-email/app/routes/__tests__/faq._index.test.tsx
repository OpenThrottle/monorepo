import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../faq._index';

describe('routes/faq._index.tsx', () => {
  test('renders the FAQ heading and questions from docs-content', () => {
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
      view.getByRole('heading', {
        level: 1,
        name: 'Frequently asked questions',
      }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'How do I compose a message?' }),
    ).toBeInTheDocument();
  });
});
