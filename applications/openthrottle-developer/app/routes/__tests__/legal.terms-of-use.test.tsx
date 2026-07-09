import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import TermsOfUse from '../legal.terms-of-use';

function stubMatches(): React.ComponentProps<typeof TermsOfUse>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/legal.terms-of-use.tsx', () => {
  test('should render terms heading', () => {
    const view = render(
      <MemoryRouter>
        <TermsOfUse
          actionData={undefined}
          loaderData={{}}
          matches={stubMatches()}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Terms of use' }),
    ).toBeInTheDocument();
  });
});
