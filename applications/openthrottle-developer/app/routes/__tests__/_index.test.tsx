import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../_index';

describe('routes/_index.tsx', () => {
  test('renders home hero and product features', () => {
    const view = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByTestId('HomeHeroV1')).toBeInTheDocument();
  });
});
