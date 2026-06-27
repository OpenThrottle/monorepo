import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import License from '../legal.license';

describe('routes/legal.license.tsx', () => {
  test('should render license heading', () => {
    const view = render(
      <MemoryRouter>
        <License
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
        name: 'End User License Agreement',
      }),
    ).toBeInTheDocument();
  });
});
