import { createMock } from '@golevelup/ts-vitest';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { CmsSchemasResolver } from './cms-schemas.resolver.ts';
import type { CmsSchemasService } from './cms-schemas.service.ts';

const buildResolver = () => {
  const service = createMock<CmsSchemasService>();

  vi.mocked(service.findPage).mockResolvedValue({
    hasNextPage: false,
    items: [],
    totalCount: 0,
  });

  return { resolver: new CmsSchemasResolver(service), service };
};

describe('CmsSchemasResolver', () => {
  describe('cmsSchemas', () => {
    it('passes a known status and default paging to the service', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsSchemas(null, 'ACTIVE', null, 'Hero');

      expect(service.findPage).toHaveBeenCalledWith({
        skip: 0,
        status: 'ACTIVE',
        take: 25,
        typename: 'Hero',
      });
    });

    it('rejects an unknown status as BAD_USER_INPUT', async () => {
      const { resolver, service } = buildResolver();
      const read = resolver.cmsSchemas(null, 'LIVE', null, null);

      await expect(read).rejects.toBeInstanceOf(GraphQLError);
      await expect(read).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(service.findPage).not.toHaveBeenCalled();
    });
  });

  describe('cmsSchemaByTypename', () => {
    it('treats an omitted version as null', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsSchemaByTypename('Hero', null);

      expect(service.findByTypename).toHaveBeenCalledWith('Hero', null);
    });
  });
});
