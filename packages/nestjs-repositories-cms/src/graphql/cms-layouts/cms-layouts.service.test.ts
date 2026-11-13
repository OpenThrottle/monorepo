import { createMock } from '@golevelup/ts-vitest';
import { GraphQLError } from 'graphql';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import type { FragmentsRepository } from '../../modules/fragments/fragments.repository.ts';
import { layoutsFactory } from '../../modules/layouts/layouts.factory.ts';
import type { LayoutsRepository } from '../../modules/layouts/layouts.repository.ts';
import type { CmsFragmentsService } from '../cms-fragments/cms-fragments.service.ts';
import { CmsLayoutsService } from './cms-layouts.service.ts';

const buildService = () => {
  const layout = layoutsFactory.build();
  const fragmentsRepository = createMock<FragmentsRepository>();
  const layoutsRepository = createMock<LayoutsRepository>();

  vi.mocked(layoutsRepository.findOne).mockResolvedValue(layout);
  vi.mocked(fragmentsRepository.findTreeRows).mockResolvedValue({
    ok: true,
    rows: [
      {
        depth: 0,
        edgeCreatedAt: null,
        isSystem: true,
        name: 'root',
        path: [layout.fragmentUuid],
        position: 0,
        properties: { a: 1 },
        schemaUuid: 'schema',
        typename: 'Layout',
        uuid: layout.fragmentUuid,
      },
    ],
  });

  return {
    fragmentsRepository,
    layout,
    layoutsRepository,
    service: new CmsLayoutsService(
      createMock<DataSource>(),
      createMock<CmsFragmentsService>(),
      fragmentsRepository,
      layoutsRepository,
    ),
  };
};

describe('CmsLayoutsService', () => {
  describe('findBySlug', () => {
    it('loads the layout by slug and its whole tree in one tree query', async () => {
      const { fragmentsRepository, layout, layoutsRepository, service } =
        buildService();

      const result = await service.findBySlug(layout.slug);

      expect(layoutsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: layout.slug },
      });
      expect(fragmentsRepository.findTreeRows).toHaveBeenCalledTimes(1);
      expect(fragmentsRepository.findTreeRows).toHaveBeenCalledWith(
        layout.fragmentUuid,
      );
      expect(result?.fragments).toEqual([
        expect.objectContaining({
          childKeys: [],
          key: layout.fragmentUuid,
          propertiesJson: '{"a":1}',
        }),
      ]);
    });

    it('returns null without reading a tree when no live layout matches', async () => {
      const { fragmentsRepository, layoutsRepository, service } =
        buildService();

      vi.mocked(layoutsRepository.findOne).mockResolvedValue(null);

      await expect(service.findBySlug('missing')).resolves.toBeNull();
      expect(fragmentsRepository.findTreeRows).not.toHaveBeenCalled();
    });

    it('fails with CMS_TREE_TOO_LARGE when the tree is over the node cap', async () => {
      const { fragmentsRepository, layout, service } = buildService();

      vi.mocked(fragmentsRepository.findTreeRows).mockResolvedValue({
        ok: false,
        reason: 'too-large',
      });

      const read = service.findBySlug(layout.slug);

      await expect(read).rejects.toBeInstanceOf(GraphQLError);
      await expect(read).rejects.toMatchObject({
        extensions: { code: 'CMS_TREE_TOO_LARGE' },
      });
    });
  });

  describe('findByUuid', () => {
    it('returns null for a non-uuid without querying', async () => {
      const { layoutsRepository, service } = buildService();

      await expect(service.findByUuid('not-a-uuid')).resolves.toBeNull();
      expect(layoutsRepository.findOne).not.toHaveBeenCalled();
    });

    it('loads the layout by uuid', async () => {
      const { layout, layoutsRepository, service } = buildService();

      await expect(service.findByUuid(layout.uuid)).resolves.toMatchObject({
        uuid: layout.uuid,
      });
      expect(layoutsRepository.findOne).toHaveBeenCalledWith({
        where: { uuid: layout.uuid },
      });
    });
  });
});
