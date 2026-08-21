import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import CreateNote, { loader } from '../notes.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { Route } from '@/app/routes/+types/notes.create';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/notes.create',
    loaderData: { authorName: null },
    params: {},
    pathname: '/',
  },
];

const loaderArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/notes/create');

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/notes/create',
    request,
    url: new URL(request.url),
  };
};

describe('routes/notes.create.tsx', () => {
  test('renders note form in create mode', () => {
    renderRoutesStub(
      <CreateNote
        actionData={undefined}
        loaderData={{ authorName: null }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByTestId('NoteForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeRequired();
    expect(
      screen.getByRole('button', { name: /create note/i }),
    ).toBeInTheDocument();
  });

  test('attributes the note to the signed-in user, with no author input', () => {
    renderRoutesStub(
      <CreateNote
        actionData={undefined}
        loaderData={{ authorName: 'visormatt' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByText('Author: visormatt')).toBeInTheDocument();
    // Attribution replaces the input outright — nothing to type, nothing to spoof.
    expect(screen.queryByLabelText(/author/i)).toBeNull();
  });

  test('renders no attribution when the loader found no user', () => {
    renderRoutesStub(
      <CreateNote
        actionData={undefined}
        loaderData={{ authorName: null }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.queryByText(/^Author:/)).toBeNull();
  });
});

describe('routes/notes.create loader', () => {
  test("returns the signed-in user's github username", async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<
        Awaited<ReturnType<typeof graphqlWithAuth.executeGraphqlWithAuth>>
      >({ me: { githubUsername: 'visormatt' } }),
    );

    await expect(loader(loaderArgs())).resolves.toEqual({
      authorName: 'visormatt',
    });
  });

  test('degrades to no attribution when the me query fails', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('unauthorized'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(loader(loaderArgs())).resolves.toEqual({ authorName: null });
  });
});
