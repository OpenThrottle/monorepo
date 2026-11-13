import { createMock } from '@golevelup/ts-vitest';
import type { DataSource, EntityManager } from 'typeorm';
import { Equal, IsNull, Or } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { CMS_STATUS } from '../../config/config.constants.ts';
import { fragmentsFactory } from '../../modules/fragments/fragments.factory.ts';
import type { FragmentsRepository } from '../../modules/fragments/fragments.repository.ts';
import { schemasFactory } from '../../modules/schemas/schemas.factory.ts';
import type { SchemasRepository } from '../../modules/schemas/schemas.repository.ts';
import { CmsSchemaValidationService } from '../cms-schema-validation/cms-schema-validation.service.ts';
import { CmsFragmentsService } from './cms-fragments.service.ts';

const HEADING_SCHEMA = {
  additionalProperties: false,
  properties: {
    copy: { default: 'Title', type: 'string' },
    heading: { default: 'h2', enum: ['h1', 'h2'], type: 'string' },
  },
  type: 'object',
};

const buildService = () => {
  const dataSource = createMock<DataSource>();
  const fragmentsRepository = createMock<FragmentsRepository>();
  const schemasRepository = createMock<SchemasRepository>();
  const active = schemasFactory.build({
    jsonSchema: HEADING_SCHEMA,
    status: CMS_STATUS.ACTIVE,
    typename: 'Heading',
  });

  vi.mocked(fragmentsRepository.create).mockImplementation(async (input) => {
    return fragmentsFactory.build({ ...input, isSystem: false });
  });
  vi.mocked(fragmentsRepository.update).mockImplementation(
    async (uuid, input) => {
      return fragmentsFactory.build({ ...input, uuid });
    },
  );

  return {
    active,
    dataSource,
    fragmentsRepository,
    schemasRepository,
    service: new CmsFragmentsService(
      dataSource,
      fragmentsRepository,
      schemasRepository,
      new CmsSchemaValidationService(),
    ),
  };
};

const mockTransaction = (dataSource: DataSource): EntityManager => {
  const manager = createMock<EntityManager>();

  vi.mocked(dataSource.transaction).mockImplementation(
    async (...args: unknown[]) => {
      const work = args.find((arg) => typeof arg === 'function');

      if (typeof work !== 'function') {
        throw new Error('transaction called without a callback');
      }

      return work(manager);
    },
  );

  return manager;
};

describe('CmsFragmentsService', () => {
  describe('findPage', () => {
    it('lists live fragments unfiltered when no filter is given', async () => {
      const { fragmentsRepository, service } = buildService();
      const fragment = fragmentsFactory.build();

      vi.mocked(fragmentsRepository.findByPaginated).mockResolvedValue({
        data: [fragment],
        pageInfo: { currentPage: 1, hasNextPage: true, totalCount: 3 },
      });

      await expect(
        service.findPage({ isSystem: null, skip: 0, take: 1, typename: null }),
      ).resolves.toMatchObject({
        hasNextPage: true,
        items: [{ uuid: fragment.uuid }],
        totalCount: 3,
      });
      expect(fragmentsRepository.findByPaginated).toHaveBeenCalledWith({
        skip: 0,
        take: 1,
        where: {},
      });
    });

    it('narrows by typename and treats isSystem false as false-or-unset', async () => {
      const { fragmentsRepository, service } = buildService();

      vi.mocked(fragmentsRepository.findByPaginated).mockResolvedValue({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
      });

      await service.findPage({
        isSystem: false,
        skip: 5,
        take: 10,
        typename: 'Heading',
      });

      expect(fragmentsRepository.findByPaginated).toHaveBeenCalledWith({
        skip: 5,
        take: 10,
        where: { isSystem: Or(Equal(false), IsNull()), typename: 'Heading' },
      });
    });

    it('narrows to system fragments for isSystem true', async () => {
      const { fragmentsRepository, service } = buildService();

      vi.mocked(fragmentsRepository.findByPaginated).mockResolvedValue({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
      });

      await service.findPage({
        isSystem: true,
        skip: 0,
        take: 25,
        typename: null,
      });

      expect(fragmentsRepository.findByPaginated).toHaveBeenCalledWith({
        skip: 0,
        take: 25,
        where: { isSystem: Equal(true) },
      });
    });
  });

  describe('clone', () => {
    describe('without children', () => {
      it('copies the fragment alone on its pinned schema, named "<name> (copy)"', async () => {
        const { dataSource, fragmentsRepository, service } = buildService();
        const source = fragmentsFactory.build({
          isSystem: true,
          name: 'Hero',
          properties: { copy: 'Hi' },
        });
        const manager = mockTransaction(dataSource);

        vi.mocked(fragmentsRepository.findOne).mockResolvedValue(source);
        vi.mocked(manager.findOneOrFail).mockImplementation(
          async (_entity, options) => {
            return fragmentsFactory.build({
              name: 'Hero (copy)',
              uuid: String(Reflect.get(Object(options.where), 'uuid')),
            });
          },
        );

        const copy = await service.clone({
          includeChildren: null,
          name: null,
          uuid: source.uuid,
        });

        expect(manager.query).toHaveBeenCalledTimes(1);
        expect(manager.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO fragments '),
          [
            [copy.uuid],
            ['Hero (copy)'],
            [false],
            ['{"copy":"Hi"}'],
            [source.schemaUuid],
            [source.typename],
          ],
        );
        expect(fragmentsRepository.findTreeRows).not.toHaveBeenCalled();
        expect(copy.uuid).not.toBe(source.uuid);
      });
    });

    describe('with children', () => {
      it('copies the live subtree and inserts its edges in the same transaction', async () => {
        const { dataSource, fragmentsRepository, service } = buildService();
        const source = fragmentsFactory.build({ name: 'Section' });
        const childUuid = fragmentsFactory.build().uuid;
        const manager = mockTransaction(dataSource);
        const row = {
          edgeCreatedAt: null,
          isSystem: false,
          properties: {},
          schemaUuid: source.schemaUuid,
          typename: source.typename,
        };

        vi.mocked(fragmentsRepository.findOne).mockResolvedValue(source);
        vi.mocked(fragmentsRepository.findTreeRows).mockResolvedValue({
          ok: true,
          rows: [
            {
              ...row,
              depth: 0,
              name: 'Section',
              path: [source.uuid],
              position: 0,
              uuid: source.uuid,
            },
            {
              ...row,
              depth: 1,
              name: 'Child',
              path: [source.uuid, childUuid],
              position: 3,
              uuid: childUuid,
            },
          ],
        });
        vi.mocked(manager.findOneOrFail).mockResolvedValue(
          fragmentsFactory.build(),
        );

        await service.clone({
          includeChildren: true,
          name: 'Section B',
          uuid: source.uuid,
        });

        expect(manager.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO fragments '),
          expect.arrayContaining([['Section B', 'Child']]),
        );
        expect(manager.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO fragments_children'),
          [[expect.any(String)], [expect.any(String)], [3]],
        );
      });

      it('is BAD_USER_INPUT for a subtree past the tree cap and writes nothing', async () => {
        const { dataSource, fragmentsRepository, service } = buildService();
        const source = fragmentsFactory.build();

        vi.mocked(fragmentsRepository.findOne).mockResolvedValue(source);
        vi.mocked(fragmentsRepository.findTreeRows).mockResolvedValue({
          ok: false,
          reason: 'too-large',
        });

        await expect(
          service.clone({
            includeChildren: true,
            name: null,
            uuid: source.uuid,
          }),
        ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
        expect(dataSource.transaction).not.toHaveBeenCalled();
      });
    });

    it('is NOT_FOUND for a missing fragment', async () => {
      const { dataSource, fragmentsRepository, service } = buildService();

      vi.mocked(fragmentsRepository.findOne).mockResolvedValue(null);

      await expect(
        service.clone({
          includeChildren: false,
          name: null,
          uuid: fragmentsFactory.build().uuid,
        }),
      ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    describe('when the typename has an ACTIVE schema', () => {
      it('pins it, prefills its defaults and applies the overrides', async () => {
        const { active, fragmentsRepository, schemasRepository, service } =
          buildService();

        vi.mocked(schemasRepository.findOne).mockResolvedValue(active);

        await service.create({
          name: 'Intro',
          propertiesJson: '{"heading":"h1"}',
          typename: 'Heading',
        });

        expect(schemasRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: CMS_STATUS.ACTIVE, typename: 'Heading' },
          }),
        );
        expect(fragmentsRepository.create).toHaveBeenCalledWith({
          isSystem: false,
          name: 'Intro',
          properties: { copy: 'Title', heading: 'h1' },
          schemaUuid: active.uuid,
          typename: 'Heading',
        });
      });

      it('rejects invalid properties with their issues and writes nothing', async () => {
        const { active, fragmentsRepository, schemasRepository, service } =
          buildService();

        vi.mocked(schemasRepository.findOne).mockResolvedValue(active);

        await expect(
          service.create({
            name: 'Intro',
            propertiesJson: '{"heading":"h9"}',
            typename: 'Heading',
          }),
        ).rejects.toMatchObject({
          extensions: {
            code: 'BAD_USER_INPUT',
            issues: [expect.objectContaining({ instancePath: '/heading' })],
          },
        });
        expect(fragmentsRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('when the typename has no ACTIVE schema', () => {
      it('fails as BAD_USER_INPUT', async () => {
        const { schemasRepository, service } = buildService();

        vi.mocked(schemasRepository.findOne).mockResolvedValue(null);

        await expect(
          service.create({ name: 'x', propertiesJson: null, typename: 'Nope' }),
        ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      });
    });
  });

  describe('update', () => {
    it('validates against the fragment’s pinned schema, not the newest', async () => {
      const { fragmentsRepository, schemasRepository, service } =
        buildService();
      const pinned = schemasFactory.build({ jsonSchema: HEADING_SCHEMA });
      const fragment = fragmentsFactory.build({ schemaUuid: pinned.uuid });

      vi.mocked(fragmentsRepository.findOne).mockResolvedValue(fragment);
      vi.mocked(schemasRepository.findOne).mockResolvedValue(pinned);

      await service.update({
        name: null,
        propertiesJson: '{"copy":"New"}',
        uuid: fragment.uuid,
      });

      expect(schemasRepository.findOne).toHaveBeenCalledWith({
        where: { uuid: pinned.uuid },
        withDeleted: true,
      });
      expect(fragmentsRepository.update).toHaveBeenCalledWith(fragment.uuid, {
        properties: { copy: 'New' },
      });
    });

    it('is NOT_FOUND for a missing fragment', async () => {
      const { fragmentsRepository, service } = buildService();

      vi.mocked(fragmentsRepository.findOne).mockResolvedValue(null);

      await expect(
        service.update({
          name: 'x',
          propertiesJson: null,
          uuid: '0b9a4f1e-5c3d-4e2a-9f10-1234567890ab',
        }),
      ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    });
  });

  describe('delete', () => {
    it('is a CONFLICT while a live parent references the fragment', async () => {
      const { dataSource, fragmentsRepository, service } = buildService();
      const fragment = fragmentsFactory.build();

      vi.mocked(fragmentsRepository.findOne).mockResolvedValue(fragment);
      vi.mocked(dataSource.query).mockResolvedValue([
        { layouts: 0, parents: 1 },
      ]);

      await expect(service.delete(fragment.uuid)).rejects.toMatchObject({
        extensions: { code: 'CONFLICT' },
      });
      expect(fragmentsRepository.remove).not.toHaveBeenCalled();
    });

    it('is a CONFLICT while a live layout is rooted at the fragment', async () => {
      const { dataSource, fragmentsRepository, service } = buildService();
      const fragment = fragmentsFactory.build();

      vi.mocked(fragmentsRepository.findOne).mockResolvedValue(fragment);
      vi.mocked(dataSource.query).mockResolvedValue([
        { layouts: 1, parents: 0 },
      ]);

      await expect(service.delete(fragment.uuid)).rejects.toMatchObject({
        extensions: { code: 'CONFLICT' },
      });
      expect(fragmentsRepository.remove).not.toHaveBeenCalled();
    });

    it('soft deletes an unreferenced fragment', async () => {
      const { dataSource, fragmentsRepository, service } = buildService();
      const fragment = fragmentsFactory.build();

      vi.mocked(fragmentsRepository.findOne).mockResolvedValue(fragment);
      vi.mocked(dataSource.query).mockResolvedValue([
        { layouts: 0, parents: 0 },
      ]);
      vi.mocked(fragmentsRepository.remove).mockResolvedValue(fragment);

      await expect(service.delete(fragment.uuid)).resolves.toMatchObject({
        uuid: fragment.uuid,
      });
    });
  });
});
