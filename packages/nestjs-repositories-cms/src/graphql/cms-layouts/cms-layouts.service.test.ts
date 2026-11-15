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
  const dataSource = createMock<DataSource>();
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
    dataSource,
    fragmentsRepository,
    layout,
    layoutsRepository,
    service: new CmsLayoutsService(
      dataSource,
      createMock<CmsFragmentsService>(),
      fragmentsRepository,
      layoutsRepository,
    ),
  };
};

describe('CmsLayoutsService', () => {
  describe('findAvailableTypenames', () => {
    describe('when the layout is live', () => {
      it('returns live ACTIVE schema typenames without the root Layout, as the query sorts them', async () => {
        const { dataSource, layout, service } = buildService();

        vi.mocked(dataSource.query).mockResolvedValue([
          { typename: 'Button' },
          { typename: 'Heading' },
        ]);

        await expect(
          service.findAvailableTypenames(layout.uuid),
        ).resolves.toEqual(['Button', 'Heading']);
        expect(dataSource.query).toHaveBeenCalledWith(
          expect.stringMatching(
            /DISTINCT typename[\s\S]*status = \$1 AND is_deleted IS NOT TRUE AND typename <> \$2[\s\S]*ORDER BY typename/,
          ),
          ['ACTIVE', 'Layout'],
        );
      });
    });

    describe('when the layout is missing or deleted', () => {
      it('is NOT_FOUND and reads no schemas', async () => {
        const { dataSource, layout, layoutsRepository, service } =
          buildService();

        vi.mocked(layoutsRepository.findOne).mockResolvedValue(null);

        await expect(
          service.findAvailableTypenames(layout.uuid),
        ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
        expect(dataSource.query).not.toHaveBeenCalled();
      });
    });

    describe('when the uuid is malformed', () => {
      it('is NOT_FOUND without querying', async () => {
        const { layoutsRepository, service } = buildService();

        await expect(
          service.findAvailableTypenames('not-a-uuid'),
        ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
        expect(layoutsRepository.findOne).not.toHaveBeenCalled();
      });
    });
  });

  describe('findPage', () => {
    describe('for the public', () => {
      it('pages ACTIVE layouts only', async () => {
        const { layout, layoutsRepository, service } = buildService();

        vi.mocked(layoutsRepository.findByPaginated).mockResolvedValue({
          data: [layout],
          pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 1 },
        });

        await expect(
          service.findPage({ skip: 0, take: 25 }, 'public'),
        ).resolves.toMatchObject({ hasNextPage: false, totalCount: 1 });
        expect(layoutsRepository.findByPaginated).toHaveBeenCalledWith({
          skip: 0,
          take: 25,
          where: { status: 'ACTIVE' },
        });
      });
    });

    describe('for an editor', () => {
      it('pages every status', async () => {
        const { layoutsRepository, service } = buildService();

        vi.mocked(layoutsRepository.findByPaginated).mockResolvedValue({
          data: [],
          pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
        });

        await service.findPage({ skip: 25, take: 25 }, 'editor');

        expect(layoutsRepository.findByPaginated).toHaveBeenCalledWith({
          skip: 25,
          take: 25,
          where: {},
        });
      });
    });
  });

  describe('findBySlug', () => {
    describe('for the public', () => {
      it('reads only an ACTIVE layout, so a DRAFT or DISABLED slug is null', async () => {
        const { layout, layoutsRepository, service } = buildService();

        await service.findBySlug(layout.slug, 'public');

        expect(layoutsRepository.findOne).toHaveBeenCalledWith({
          where: { slug: layout.slug, status: 'ACTIVE' },
        });
      });
    });

    describe('for an editor', () => {
      it('loads the layout by slug whatever its status, and its whole tree in one tree query', async () => {
        const { fragmentsRepository, layout, layoutsRepository, service } =
          buildService();

        const result = await service.findBySlug(layout.slug, 'editor');

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
    });

    describe('when no live layout matches', () => {
      it('returns null without reading a tree', async () => {
        const { fragmentsRepository, layoutsRepository, service } =
          buildService();

        vi.mocked(layoutsRepository.findOne).mockResolvedValue(null);

        await expect(
          service.findBySlug('missing', 'public'),
        ).resolves.toBeNull();
        expect(fragmentsRepository.findTreeRows).not.toHaveBeenCalled();
      });
    });

    describe('when the tree is over the node cap', () => {
      it('fails with CMS_TREE_TOO_LARGE', async () => {
        const { fragmentsRepository, layout, service } = buildService();

        vi.mocked(fragmentsRepository.findTreeRows).mockResolvedValue({
          ok: false,
          reason: 'too-large',
        });

        const read = service.findBySlug(layout.slug, 'editor');

        await expect(read).rejects.toBeInstanceOf(GraphQLError);
        await expect(read).rejects.toMatchObject({
          extensions: { code: 'CMS_TREE_TOO_LARGE' },
        });
      });
    });
  });

  describe('findByUuid', () => {
    describe('when the uuid is malformed', () => {
      it('returns null without querying', async () => {
        const { layoutsRepository, service } = buildService();

        await expect(
          service.findByUuid('not-a-uuid', 'editor'),
        ).resolves.toBeNull();
        expect(layoutsRepository.findOne).not.toHaveBeenCalled();
      });
    });

    describe('for the public', () => {
      it('reads only an ACTIVE layout', async () => {
        const { layout, layoutsRepository, service } = buildService();

        await service.findByUuid(layout.uuid, 'public');

        expect(layoutsRepository.findOne).toHaveBeenCalledWith({
          where: { status: 'ACTIVE', uuid: layout.uuid },
        });
      });
    });

    describe('for an editor', () => {
      it('loads the layout by uuid whatever its status', async () => {
        const { layout, layoutsRepository, service } = buildService();

        await expect(
          service.findByUuid(layout.uuid, 'editor'),
        ).resolves.toMatchObject({ uuid: layout.uuid });
        expect(layoutsRepository.findOne).toHaveBeenCalledWith({
          where: { uuid: layout.uuid },
        });
      });
    });
  });
});
