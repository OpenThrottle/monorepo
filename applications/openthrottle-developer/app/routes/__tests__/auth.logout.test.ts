// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createActionArgs,
  createLoaderArgs,
} from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/auth.logout';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('@openthrottle/react-router-auth', () => ({
  getClearAuthCookieHeader: vi.fn(() => 'ot_auth=; Max-Age=0'),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { getClearAuthCookieHeader } =
  await import('@openthrottle/react-router-auth');
const { action, loader } = await import('../auth.logout');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockGetClearAuthCookieHeader = vi.mocked(getClearAuthCookieHeader);

const catchRedirect = async (promise: Promise<unknown>): Promise<Response> => {
  try {
    const result = await promise;
    if (result instanceof Response) {
      return result;
    }
    throw new Error('Expected a redirect Response');
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }
};

describe('routes/auth.logout', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockGetClearAuthCookieHeader.mockReset();
    mockGetClearAuthCookieHeader.mockReturnValue('ot_auth=; Max-Age=0');
  });

  describe('loader', () => {
    test('signs out, clears the cookie, and redirects to / on success', async () => {
      mockExecute.mockResolvedValue({ signout: true });

      const response = await catchRedirect(
        loader(
          createLoaderArgs<Route.LoaderArgs>({
            url: 'http://localhost/auth/logout',
          }),
        ),
      );

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
      expect(response.headers.get('Set-Cookie')).toBe('ot_auth=; Max-Age=0');
    });

    test('still clears the cookie and redirects when the signout mutation throws', async () => {
      mockExecute.mockRejectedValue(new Error('token already invalid'));

      const response = await catchRedirect(
        loader(
          createLoaderArgs<Route.LoaderArgs>({
            url: 'http://localhost/auth/logout',
          }),
        ),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
      expect(response.headers.get('Set-Cookie')).toBe('ot_auth=; Max-Age=0');
    });
  });

  describe('action', () => {
    test('signs out, clears the cookie, and redirects to / on success', async () => {
      mockExecute.mockResolvedValue({ signout: true });

      const response = await catchRedirect(
        action(
          createActionArgs<Route.ActionArgs>({
            url: 'http://localhost/auth/logout',
          }),
        ),
      );

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    test('still clears the cookie and redirects when the signout mutation throws', async () => {
      mockExecute.mockRejectedValue(new Error('boom'));

      const response = await catchRedirect(
        action(
          createActionArgs<Route.ActionArgs>({
            url: 'http://localhost/auth/logout',
          }),
        ),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('Set-Cookie')).toBe('ot_auth=; Max-Age=0');
    });
  });
});
