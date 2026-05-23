import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import LegalIndex from '../legal._index';

describe('routes/legal._index.tsx', () => {
  test('renders about section, OpenThrottle link, stack logos, and author block', () => {
    const view = render(
      <MemoryRouter>
        <LegalIndex
          actionData={undefined}
          loaderData={undefined}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'About' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'OpenThrottle' })).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle?ref=openthrottle',
    );
    expect(view.getByRole('link', { name: 'BullMQ' })).toHaveAttribute(
      'href',
      'https://bullmq.io',
    );
    expect(
      view.getByRole('heading', { level: 2, name: 'Matthew Scholta' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'openthrottle.ai@gmail.com' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'mattscholta.com' })).toHaveAttribute(
      'href',
      'https://mattscholta.com?ref=openthrottle-developer',
    );
  });
});
