import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CreateProject from '../projects.create';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/projects.create';

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
