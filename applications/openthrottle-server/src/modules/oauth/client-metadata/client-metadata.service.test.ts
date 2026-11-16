import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  OAuthClient,
  OAuthService,
} from '@openthrottle/nestjs-repositories-server';
import { describe, expect, it, vi } from 'vitest';

import { ClientMetadataService } from './client-metadata.service.ts';

const NOW = new Date('2026-11-16T00:00:00Z');

const buildService = (
  cached: Partial<OAuthClient> | null,
): {
  readonly service: ClientMetadataService;
  readonly upsert: ReturnType<typeof vi.fn>;
} => {
  const upsert = vi.fn();
  const oauthService: Partial<Record<keyof OAuthService, unknown>> = {
    findClientByClientId: vi.fn().mockResolvedValue(cached),
    upsertMetadataDocumentClient: upsert,
  };
  const service: ClientMetadataService = Reflect.construct(
    ClientMetadataService,
    [createMock<LoggerService>(), oauthService],
  );
  return { service, upsert };
};

describe('ClientMetadataService.resolve', () => {
  it('refuses a client_id that is not a metadata URL', async () => {
    const { service } = buildService(null);

    expect((await service.resolve('ot_client_x', NOW)).ok).toBe(false);
  });

  it('serves a fresh cached client without fetching', async () => {
    const cached = {
      clientId: 'https://localhost/m',
      metadataFetchedAt: new Date(NOW.getTime() - 1000),
    };
    const { service, upsert } = buildService(cached);

    const result = await service.resolve('https://localhost/m', NOW);

    expect(result).toEqual({ client: cached, ok: true });
    expect(upsert).not.toHaveBeenCalled();
  });

  describe('when the document must be fetched', () => {
    it('refuses a host that resolves to loopback at connect time', async () => {
      const { service, upsert } = buildService(null);

      const result = await service.resolve('https://localhost/m', NOW);

      expect(result.ok).toBe(false);
      expect(result.ok ? '' : result.error).toContain('non-public address');
      expect(upsert).not.toHaveBeenCalled();
    });

    it('falls back to a stale cached copy under a day old when the fetch fails', async () => {
      const cached = {
        clientId: 'https://localhost/m',
        metadataFetchedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      };
      const { service } = buildService(cached);

      expect(await service.resolve('https://localhost/m', NOW)).toEqual({
        client: cached,
        ok: true,
      });
    });
  });
});
