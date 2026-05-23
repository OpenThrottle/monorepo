import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader } from '../settings.keys';
import {
  SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM,
  SETTINGS_KEYS_PROBE_SERVICE_ACCOUNT_ID,
} from '~/routing/settings/utils/settings-keys-action';
import type { Route } from '@/app/routes/+types/settings.keys';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const mockServiceAccount = {
  createdAt: '2026-05-18T12:00:00.000Z',
  description: 'MCP developer',
  disabledAt: null,
  id: 'sa-mcp-developer',
  name: 'mcp-developer',
};

const mockCredential = {
  createdAt: '2026-05-18T12:00:00.000Z',
  expiresAt: null,
  id: 'cred-1',
  label: 'Local dev',
  lastUsedAt: null,
  prefix: 'abcd',
  revokedAt: null,
  serviceAccountId: mockServiceAccount.id,
};

const mockKeysPayload = {
  serviceAccountCredentials: [mockCredential],
  serviceAccounts: [mockServiceAccount],
};

describe('routes/settings.keys.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    const loaderArgs = (url: string): Route.LoaderArgs => ({
      context: {},
      params: {},
      request: new Request(url),
      unstable_pattern: '/settings/keys',
    });

    test('returns empty data when no service accounts exist', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        serviceAccountCredentials: [],
        serviceAccounts: [],
      });

      const result = await loader(loaderArgs('http://localhost/settings/keys'));

      expect(result).toEqual({
        credentials: [],
        selectedServiceAccountId: null,
        serviceAccounts: [],
      });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { serviceAccountId: SETTINGS_KEYS_PROBE_SERVICE_ACCOUNT_ID },
      );
    });

    test('selects first account and refetches credentials when account param is absent', async () => {
      mockExecuteGraphqlWithAuth
        .mockResolvedValueOnce({
          serviceAccountCredentials: [],
          serviceAccounts: [mockServiceAccount],
        })
        .mockResolvedValueOnce(mockKeysPayload);

      const result = await loader(loaderArgs('http://localhost/settings/keys'));

      expect(result.selectedServiceAccountId).toBe(mockServiceAccount.id);
      expect(result.credentials).toEqual([mockCredential]);
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        2,
        expect.any(Request),
        expect.any(Object),
        { serviceAccountId: mockServiceAccount.id },
      );
    });

    test('uses account search param without a second fetch when valid', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockKeysPayload);

      const result = await loader(
        loaderArgs(
          `http://localhost/settings/keys?${SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM}=${mockServiceAccount.id}`,
        ),
      );

      expect(result).toEqual({
        credentials: [mockCredential],
        selectedServiceAccountId: mockServiceAccount.id,
        serviceAccounts: [mockServiceAccount],
      });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('action', () => {
    const actionArgs = (formData: FormData): Route.ActionArgs => ({
      context: {},
      params: {},
      request: new Request('http://localhost/settings/keys', {
        body: formData,
        method: 'POST',
      }),
      unstable_pattern: '/settings/keys',
    });

    test('createCredential passes optional label and expiresAt to mutation', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createServiceAccountCredential: {
          credential: mockCredential,
          token: 'ot_sa_abcd_secret',
        },
      });

      const formData = new FormData();
      formData.set('intent', 'createCredential');
      formData.set('serviceAccountId', mockServiceAccount.id);
      formData.set('label', '  CI token  ');
      formData.set('expiresAt', '2026-12-31T00:00:00.000Z');

      await action(actionArgs(formData));

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        {
          input: {
            expiresAt: new Date('2026-12-31T00:00:00.000Z'),
            label: 'CI token',
            serviceAccountId: mockServiceAccount.id,
          },
        },
      );
    });

    test('createCredential returns token and credential metadata', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createServiceAccountCredential: {
          credential: mockCredential,
          token: 'ot_sa_abcd_secret',
        },
      });

      const formData = new FormData();
      formData.set('intent', 'createCredential');
      formData.set('serviceAccountId', mockServiceAccount.id);
      formData.set('label', 'CI token');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({
        credential: mockCredential,
        intent: 'createCredential',
        token: 'ot_sa_abcd_secret',
      });
    });

    test('createCredential returns error when GraphQL returns no token', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createServiceAccountCredential: {
          credential: null,
          token: null,
        },
      });

      const formData = new FormData();
      formData.set('intent', 'createCredential');
      formData.set('serviceAccountId', mockServiceAccount.id);

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Failed to create credential.' });
    });

    test('createCredential returns error message when mutation throws', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('Forbidden'));

      const formData = new FormData();
      formData.set('intent', 'createCredential');
      formData.set('serviceAccountId', mockServiceAccount.id);

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Forbidden' });
    });

    test('createCredential returns error when service account id is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'createCredential');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Service account is required.' });
    });

    test('revokeCredential calls revoke mutation', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        revokeServiceAccountCredential: true,
      });

      const formData = new FormData();
      formData.set('intent', 'revokeCredential');
      formData.set('credentialId', mockCredential.id);

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ ok: true });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { credentialId: mockCredential.id },
      );
    });

    test('revokeCredential returns error when mutation throws', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(
        new Error('Credential not found'),
      );

      const formData = new FormData();
      formData.set('intent', 'revokeCredential');
      formData.set('credentialId', mockCredential.id);

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Credential not found' });
    });

    test('revokeCredential returns error when credential id is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'revokeCredential');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Credential id is required.' });
    });

    test('throws on invalid intent', async () => {
      const formData = new FormData();
      formData.set('intent', 'unknown');

      await expect(action(actionArgs(formData))).rejects.toThrow(
        'Invalid intent',
      );
    });
  });
});
