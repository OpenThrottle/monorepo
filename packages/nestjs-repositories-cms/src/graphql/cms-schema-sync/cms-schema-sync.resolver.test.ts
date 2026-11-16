import { createMock } from '@golevelup/ts-vitest';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { CmsSchemaSyncResolver } from './cms-schema-sync.resolver.ts';
import type { CmsSchemaSyncService } from './cms-schema-sync.service.ts';

describe('CmsSchemaSyncResolver', () => {
  describe('syncCmsSchemas', () => {
    it('returns what the sync changed', async () => {
      const service = createMock<CmsSchemaSyncService>();

      vi.mocked(service.sync).mockResolvedValue({
        ok: true,
        result: { activated: [], disabled: [], inserted: ['Hero@a'], total: 1 },
      });

      const result = await new CmsSchemaSyncResolver(service).syncCmsSchemas();

      expect(result).toEqual({ activated: [], disabled: [], inserted: ['Hero@a'], total: 1 }); // prettier-ignore
    });

    it('raises CMS_SCHEMA_SYNC_FAILED with the sync error', async () => {
      const service = createMock<CmsSchemaSyncService>();

      vi.mocked(service.sync).mockResolvedValue({ error: 'stale', ok: false });

      const sync = new CmsSchemaSyncResolver(service).syncCmsSchemas();

      await expect(sync).rejects.toBeInstanceOf(GraphQLError);
      await expect(sync).rejects.toMatchObject({
        extensions: { code: 'CMS_SCHEMA_SYNC_FAILED' },
        message: 'stale',
      });
    });
  });
});
