import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import PrivacyPolicy from '../legal.privacy-policy';

describe('routes/legal.privacy-policy.tsx', () => {
  test('should render privacy policy heading', () => {
    const view = render(
      <MemoryRouter>
        <PrivacyPolicy
          actionData={undefined}
          loaderData={undefined}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Privacy policy' }),
    ).toBeInTheDocument();
  });
});
