import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/projects.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';

import CreateProject from '../projects.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/projects.create',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/projects.create.tsx', () => {
  test('renders project form in create mode', () => {
    renderRoutesStub(
      <CreateProject
        actionData={undefined}
        loaderData={{}}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByTestId('ProjectForm')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project name')).toBeRequired();
    expect(
      screen.getByRole('button', { name: 'Create project' }),
    ).toBeInTheDocument();
  });
});
