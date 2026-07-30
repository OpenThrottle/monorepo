import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import AuthIndex from '../auth._index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/_index';

const composerData = Promise.resolve({
  models: [{ id: 'model-1', label: 'GPT-4' }],
  personas: [{ id: 'persona-1', label: 'Engineer' }],
  repositories: [{ displayName: 'monorepo', id: 'repo-1' }],
});

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData: { composerData },
    params: {},
    pathname: '/',
  },
];

describe('routes/auth._index.tsx', () => {
  test('renders sign-in form', () => {
    renderRoutesStub(
      <AuthIndex
        actionData={undefined}
        loaderData={{ composerData }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
