/**
 * @description Smoke tests for authenticated MCP tools using service account tokens (mocked GraphQL).
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withMcpDeveloperAuthToken } from '../auth/get-auth-token.ts';
import { listSourcesToolHandler } from './search.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

describe('listSourcesToolHandler — auth enabled path', () => {
  const serviceAccountToken = '***REMOVED-OT-TOKEN***';

  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  it('fails when OPENTHROTTLE_MCP_AUTH_TOKEN is unset', async () => {
    const result = await listSourcesToolHandler({});

    expect(result).toMatchObject({
      content: [{ text: expect.stringMatching(/OPENTHROTTLE_MCP_AUTH_TOKEN/) }],
      isError: true,
    });
    expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
  });

  it('calls executeGraphqlWithAuth with ot_sa token from env', async () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      listSources: {
        plans: [{ id: 'plan-1', title: 'Smoke plan' }],
        sources: ['plan'],
      },
    });

    const result = await listSourcesToolHandler({});

    expect(result).toMatchObject({
      structuredContent: {
        plans: [{ id: 'plan-1', title: 'Smoke plan' }],
      },
    });
    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      serviceAccountToken,
      expect.anything(),
      {},
    );
  });

  it('calls executeGraphqlWithAuth with per-request ot_sa token', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      listSources: {
        plans: [],
        sources: [],
      },
    });

    await withMcpDeveloperAuthToken(serviceAccountToken, async () => {
      await listSourcesToolHandler({});

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {},
      );
    });
  });
});
