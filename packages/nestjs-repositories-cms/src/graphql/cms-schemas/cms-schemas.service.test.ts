import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import { CMS_STATUS } from '../../config/config.constants.ts';
import { schemasFactory } from '../../modules/schemas/schemas.factory.ts';
import type { SchemasRepository } from '../../modules/schemas/schemas.repository.ts';
import { CmsSchemasService } from './cms-schemas.service.ts';

const buildService = () => {
  const schemasRepository = createMock<SchemasRepository>();

  vi.mocked(schemasRepository.findByPaginated).mockResolvedValue({
    data: [],
    pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
  });

  return {
    schemasRepository,
    service: new CmsSchemasService(schemasRepository),
  };
};

describe('CmsSchemasService', () => {
  describe('findPage', () => {
    it('filters by status and typename when given', async () => {
      const { schemasRepository, service } = buildService();

      await service.findPage({
        skip: 0,
        status: CMS_STATUS.ACTIVE,
        take: 10,
        typename: 'Hero',
      });

      expect(schemasRepository.findByPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CMS_STATUS.ACTIVE, typename: 'Hero' },
        }),
      );
    });

    it('applies no filter when neither is given', async () => {
      const { schemasRepository, service } = buildService();

      await service.findPage({
        skip: 0,
        status: null,
        take: 10,
        typename: null,
      });

      expect(schemasRepository.findByPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findByTypename', () => {
    describe('when no version is given', () => {
      it('returns the newest ACTIVE version', async () => {
        const { schemasRepository, service } = buildService();
        const schema = schemasFactory.build({ status: CMS_STATUS.ACTIVE });

        vi.mocked(schemasRepository.findOne).mockResolvedValue(schema);

        await expect(
          service.findByTypename(schema.typename, null),
        ).resolves.toMatchObject({
          uuid: schema.uuid,
          version: schema.version,
        });
        expect(schemasRepository.findOne).toHaveBeenCalledWith({
          order: { createdAt: 'DESC', uuid: 'DESC' },
          where: { status: CMS_STATUS.ACTIVE, typename: schema.typename },
        });
      });
    });

    describe('when a version is given', () => {
      it('pins that version, whatever its status', async () => {
        const { schemasRepository, service } = buildService();

        vi.mocked(schemasRepository.findOne).mockResolvedValue(null);

        await expect(service.findByTypename('Hero', 'abc')).resolves.toBeNull();
        expect(schemasRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { typename: 'Hero', version: 'abc' },
          }),
        );
      });
    });
  });

  describe('findByUuid', () => {
    it('returns null for a non-uuid without querying', async () => {
      const { schemasRepository, service } = buildService();

      await expect(service.findByUuid('Hero')).resolves.toBeNull();
      expect(schemasRepository.findOne).not.toHaveBeenCalled();
    });

    it('serialises json_schema as a JSON string', async () => {
      const { schemasRepository, service } = buildService();
      const schema = schemasFactory.build({ jsonSchema: { type: 'object' } });

      vi.mocked(schemasRepository.findOne).mockResolvedValue(schema);

      await expect(service.findByUuid(schema.uuid)).resolves.toMatchObject({
        jsonSchemaJson: '{"type":"object"}',
      });
    });
  });
});
