import { AUTH_COOKIE_NAME } from '@openthrottle/react-router-auth';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/_index';
import { buildRootMatch } from '~/testing/buildRootMatch';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();

  return { ...actual, useReducedMotion: (): boolean => true };
});

const { assign } = vi.hoisted(() => {
  return { assign: vi.fn<(url: string) => void>() };
});

vi.mock('~/routing/auth/utils/assignDocumentLocation', () => {
  return { assignDocumentLocation: assign };
});

const { default: AuthIndex, loader } = await import('../auth._index');

const TOKEN = 'header.payload.signature';

// The route module is typed against `+types/_index`, so its props carry the
// home route's composer data; the component never reads it.
const composerData = Promise.resolve({
  agentRuntimes: {},
  defaultAgent: null,
  models: [],
  personas: [],
  repositories: [],
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

const loaderArgs = (path: string, cookie = ''): Route.LoaderArgs => {
  const request = new Request(`http://localhost${path}`, {
    headers: cookie === '' ? {} : { cookie },
  });

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/auth',
    request,
    url: new URL(request.url),
  };
};

const readLocation = (value: unknown): string | null => {
  return value instanceof Response ? value.headers.get('Location') : null;
};

describe('routes/auth._index.tsx redirectUrl', () => {
  describe('loader', () => {
    test('renders the form when there is no auth cookie', async () => {
      await expect(loader(loaderArgs('/auth?redirectUrl=%2Fplans'))).resolves.toEqual({}); // prettier-ignore
    });

    test('sends an already-authed user to the safe redirectUrl', async () => {
      const result = await loader(loaderArgs('/auth?redirectUrl=%2Fplans%2Fabc%3Ftab%3Dtasks', `${AUTH_COOKIE_NAME}=${TOKEN}`)); // prettier-ignore

      expect(readLocation(result)).toBe('/plans/abc?tab=tasks');
    });

    test('falls back to /dashboard for an unsafe redirectUrl', async () => {
      const result = await loader(loaderArgs('/auth?redirectUrl=%2F%2Fevil.test', `${AUTH_COOKIE_NAME}=${TOKEN}`)); // prettier-ignore

      expect(readLocation(result)).toBe('/dashboard');
    });

    test('falls back to /dashboard with no redirectUrl', async () => {
      const result = await loader(
        loaderArgs('/auth', `${AUTH_COOKIE_NAME}=${TOKEN}`),
      );

      expect(readLocation(result)).toBe('/dashboard');
    });
  });

  describe('after a successful login', () => {
    beforeEach(() => {
      assign.mockReset();
    });

    const signIn = async (initialEntry: string): Promise<void> => {
      const user = userEvent.setup();
      const props: Route.ComponentProps = {
        actionData: undefined,
        loaderData: { composerData },
        matches,
        params: {},
      };
      const component = renderWithMemoryRouter(
        [
          {
            action: () => {
              return { ok: true };
            },
            element: <AuthIndex {...props} />,
            path: '/auth',
          },
        ],
        { initialEntries: [initialEntry] },
      );

      await user.type(component.getByLabelText('Email'), 'dev@example.test');
      await user.type(component.getByLabelText('Password'), 'pw');
      await user.click(component.getByRole('button', { name: 'Sign in' }));
    };

    test('navigates to the redirectUrl it arrived with', async () => {
      await signIn('/auth?redirectUrl=%2Fplans%2Fabc%3Ftab%3Dtasks');

      await waitFor(() => {
        expect(assign).toHaveBeenCalledWith('/plans/abc?tab=tasks');
      });
    });

    test('navigates to /dashboard when redirectUrl is unsafe', async () => {
      await signIn('/auth?redirectUrl=%2F%2Fevil.test');

      await waitFor(() => {
        expect(assign).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});
