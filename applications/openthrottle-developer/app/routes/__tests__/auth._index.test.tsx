import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/_index';
import { buildRootMatch } from '~/testing/buildRootMatch';
import { renderRoutesStub } from '~/testing/route-fixtures';

import AuthIndex from '../auth._index';

const composerData = Promise.resolve({
  agentRuntimes: {},
  defaultAgent: null,
  models: [{ id: 'model-1', label: 'GPT-4' }],
  personas: [{ id: 'persona-1', label: 'Engineer' }],
  repositories: [
    { defaultBranch: undefined, displayName: 'monorepo', id: 'repo-1' },
  ],
});

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData: {
      composerData,
      sessionDrawer: { collapsedSections: [], isOpen: false },
    },
    params: {},
    pathname: '/',
  },
];

describe('routes/auth._index.tsx', () => {
  test('renders sign-in form', () => {
    const component = renderRoutesStub(
      <AuthIndex
        actionData={undefined}
        loaderData={{
          composerData,
          sessionDrawer: { collapsedSections: [], isOpen: false },
        }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(component.getByLabelText('Email')).toBeInTheDocument();
  });
});
