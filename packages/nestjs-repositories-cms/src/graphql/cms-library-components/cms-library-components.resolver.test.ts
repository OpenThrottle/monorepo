import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import { libraryComponentsFactory } from '../../modules/library-components/library-components.factory.ts';
import { toCmsLibraryComponentObject } from '../cms-libraries/cms-libraries.mapper.ts';
import { CmsLibraryComponentsResolver } from './cms-library-components.resolver.ts';
import type { CmsLibraryComponentsService } from './cms-library-components.service.ts';

const buildResolver = () => {
  const service = createMock<CmsLibraryComponentsService>();

  vi.mocked(service.findPage).mockResolvedValue({
    hasNextPage: false,
    items: [],
    totalCount: 0,
  });

  return { resolver: new CmsLibraryComponentsResolver(service), service };
};

describe('CmsLibraryComponentsResolver', () => {
  describe('cmsLibraryComponents', () => {
    it('passes default paging to the service when limit and offset are omitted', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsLibraryComponents(null, null);

      expect(service.findPage).toHaveBeenCalledWith({ skip: 0, take: 25 });
    });

    it('maps limit and offset to repository paging', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsLibraryComponents(5, 15);

      expect(service.findPage).toHaveBeenCalledWith({ skip: 15, take: 5 });
    });

    it('rejects a negative offset as BAD_USER_INPUT', async () => {
      const { resolver, service } = buildResolver();
      const read = resolver.cmsLibraryComponents(null, -1);

      await expect(read).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(service.findPage).not.toHaveBeenCalled();
    });
  });

  describe('cmsLibraryComponent', () => {
    it('returns the service result for a uuid', async () => {
      const { resolver, service } = buildResolver();
      const component = toCmsLibraryComponentObject(
        libraryComponentsFactory.build(),
      );

      vi.mocked(service.findByUuid).mockResolvedValue(component);

      await expect(resolver.cmsLibraryComponent(component.uuid)).resolves.toBe(
        component,
      );
      expect(service.findByUuid).toHaveBeenCalledWith(component.uuid);
    });

    it('returns null when none matches', async () => {
      const { resolver, service } = buildResolver();

      vi.mocked(service.findByUuid).mockResolvedValue(null);

      await expect(resolver.cmsLibraryComponent('missing')).resolves.toBeNull();
    });
  });
});
