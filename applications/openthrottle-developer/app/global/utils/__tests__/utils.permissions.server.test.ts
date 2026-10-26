// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PERMISSIONS } from '~/global/config/permissions';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('@openthrottle/react-router-auth', () => ({
  getAuthTokenFromCookie: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { getAuthTokenFromCookie } =
  await import('@openthrottle/react-router-auth');
const { fetchMyPermissions, requirePermission } =
  await import('../utils.permissions.server');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockGetToken = vi.mocked(getAuthTokenFromCookie);

const request = new Request('http://localhost/blog');

const catchThrown = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected the promise to reject');
};

describe('utils.permissions.server', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockGetToken.mockReset();
    mockGetToken.mockReturnValue('token');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('fetchMyPermissions', () => {
    test('returns the permission names from myPermissions', async () => {
      mockExecute.mockResolvedValue({ myPermissions: ['blog:draft'] });

      await expect(fetchMyPermissions(request)).resolves.toEqual([
        'blog:draft',
      ]);
    });

    test('skips the request for a logged-out visitor', async () => {
      mockGetToken.mockReturnValue(null);

      await expect(fetchMyPermissions(request)).resolves.toEqual([]);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('resolves to an empty list when the request fails', async () => {
      mockExecute.mockRejectedValue(new Error('boom'));

      await expect(fetchMyPermissions(request)).resolves.toEqual([]);
    });
  });

  describe('requirePermission', () => {
    test('resolves when the user holds the permission', async () => {
      mockExecute.mockResolvedValue({ myPermissions: ['blog:draft'] });

      await expect(
        requirePermission(request, PERMISSIONS.BLOG_DRAFT),
      ).resolves.toBeUndefined();
    });

    test('throws a 404 Response when the permission is missing', async () => {
      mockExecute.mockResolvedValue({ myPermissions: ['users:read'] });

      const thrown = await catchThrown(
        requirePermission(request, PERMISSIONS.BLOG_DRAFT),
      );

      expect(thrown).toBeInstanceOf(Response);
      expect(thrown instanceof Response && thrown.status).toBe(404);
    });

    test('throws a 404 Response for a logged-out visitor', async () => {
      mockGetToken.mockReturnValue(null);

      const thrown = await catchThrown(
        requirePermission(request, PERMISSIONS.BLOG_DRAFT),
      );

      expect(thrown instanceof Response && thrown.status).toBe(404);
    });
  });
});
