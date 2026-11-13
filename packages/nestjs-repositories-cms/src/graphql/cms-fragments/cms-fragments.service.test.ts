import { createMock } from '@golevelup/ts-vitest';
import type { DataSource } from 'typeorm';
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

describe('CmsFragmentsService', () => {
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
