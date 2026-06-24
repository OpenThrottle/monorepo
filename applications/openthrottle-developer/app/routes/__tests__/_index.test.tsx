import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { renderRoutesStub } from '~/testing/route-fixtures';
import Index from '../_index';

describe('routes/_index.tsx', () => {
  test('renders home build prompt heading', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={{ models: [], personas: [], repositories: [] }}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(
      view.getByText('What would you like to build today?'),
    ).toBeInTheDocument();
  });
});
