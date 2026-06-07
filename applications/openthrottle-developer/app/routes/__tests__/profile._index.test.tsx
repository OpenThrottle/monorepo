import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { OPEN_THROTTLE_CONTACT_EMAIL } from '@openthrottle/react-router-utils';
import ProfileIndex from '../profile._index';

describe('routes/profile._index.tsx', () => {
  test('renders profile name and contact email', () => {
    render(
      <MemoryRouter>
        <ProfileIndex
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Matthew Scholta')).toBeInTheDocument();
    expect(screen.getByText(OPEN_THROTTLE_CONTACT_EMAIL)).toBeInTheDocument();
  });
});
