import * as React from 'react';
import { describe, expect, test } from 'vitest';
import Component from '../plans.temp';
import { renderRoutesStub } from '~/testing/route-fixtures';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/plans.temp.tsx', () => {
  test('renders the plan id form', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{}}
        matches={stubMatches()}
        params={{}}
      />,
    );

    expect(view.getByLabelText('Plan ID')).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });
});
