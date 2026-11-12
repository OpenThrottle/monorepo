// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';

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
const { fetchMyDefaultEditor } = await import('../utils.default-editor.server');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockGetToken = vi.mocked(getAuthTokenFromCookie);

const request = new Request('http://localhost/plans');

describe('fetchMyDefaultEditor', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockGetToken.mockReset();
    mockGetToken.mockReturnValue('token');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('returns the stored default editor', async () => {
    mockExecute.mockResolvedValue({
      userPreferences: { defaultEditor: WorkspaceEditorId.Cursor },
    });

    await expect(fetchMyDefaultEditor(request)).resolves.toBe(
      WorkspaceEditorId.Cursor,
    );
  });

  test('returns null when no default is set', async () => {
    mockExecute.mockResolvedValue({
      userPreferences: { defaultEditor: null },
    });

    await expect(fetchMyDefaultEditor(request)).resolves.toBeNull();
  });

  test('skips the request for a logged-out visitor', async () => {
    mockGetToken.mockReturnValue(null);

    await expect(fetchMyDefaultEditor(request)).resolves.toBeNull();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('resolves to null when the request fails', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    await expect(fetchMyDefaultEditor(request)).resolves.toBeNull();
  });
});
