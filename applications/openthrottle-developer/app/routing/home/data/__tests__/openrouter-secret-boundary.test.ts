// @vitest-environment node
import { getPublicEnv } from '@openthrottle/react-router-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * @description Secrets boundary for the OpenRouter operator key.
 *
 * The key is server-side only. This asserts the two paths that could carry it to
 * a browser — the `window.env` public tier and the home composer's loader
 * payload — never do, even with the key present in `process.env`. A regression
 * here would ship an operator's gateway credential to every visitor, so it is
 * guarded rather than merely reviewed.
 */

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loadComposerModels } = await import('../models.server');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const SECRET = 'sk-or-v1-must-never-reach-a-browser';

const DISCOVERY_PAYLOAD = {
  discoverAgentClis: { agents: [], scannedAt: '2026-08-29T00:00:00.000Z' },
  discoverLocalModels: {
    endpoints: [],
    scannedAt: '2026-08-29T00:00:00.000Z',
    scannedHosts: ['localhost'],
  },
  discoverRemoteModels: {
    configured: true,
    fetchedAt: '2026-08-29T00:00:00.000Z',
    models: [],
    provider: 'openrouter',
    totalCount: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENROUTER_API_KEY = SECRET;
  process.env.OPENROUTER_SITE_URL = 'https://openthrottle.ai';
  mockExecute.mockResolvedValue(DISCOVERY_PAYLOAD);
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_SITE_URL;
});

describe('OpenRouter key secrets boundary', () => {
  test('getPublicEnv (what is serialized into window.env) carries no OPENROUTER value', () => {
    const publicEnv = getPublicEnv();

    // getPublicEnv is a strict explicit allowlist, so this is a guard against a
    // future edit widening it — not a check of current behavior alone.
    expect(Object.keys(publicEnv).join(' ')).not.toMatch(/openrouter/i);
    expect(JSON.stringify(publicEnv)).not.toContain(SECRET);
  });

  test('the composer loader payload carries no OPENROUTER value', async () => {
    const options = await loadComposerModels(new Request('http://localhost/'));

    expect(JSON.stringify(options)).not.toContain(SECRET);
    expect(JSON.stringify(options)).not.toMatch(/sk-or-v1/);
  });
});
