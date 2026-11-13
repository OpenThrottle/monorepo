import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

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
    it('passes default paging to the service when skip and take are omitted', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsLibraryComponents(null, null);

      expect(service.findPage).toHaveBeenCalledWith({ skip: 0, take: 25 });
    });

    it('passes explicit paging through', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsLibraryComponents(50, 10);

      expect(service.findPage).toHaveBeenCalledWith({ skip: 50, take: 10 });
    });
  });
});
