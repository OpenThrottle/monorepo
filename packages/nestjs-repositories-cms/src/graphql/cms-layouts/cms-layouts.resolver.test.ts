import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import type { CmsWriteAccessService } from '../cms-write-access/cms-write-access.service.ts';
import { CmsLayoutsResolver } from './cms-layouts.resolver.ts';
import type { CmsLayoutsService } from './cms-layouts.service.ts';

const REQUEST = { user: { sub: 'u1' } };

const buildResolver = (canWrite: boolean) => {
  const cmsLayoutsService = createMock<CmsLayoutsService>();
  const cmsWriteAccessService = createMock<CmsWriteAccessService>();

  vi.mocked(cmsWriteAccessService.canWrite).mockResolvedValue(canWrite);
  vi.mocked(cmsLayoutsService.findBySlug).mockResolvedValue(null);
  vi.mocked(cmsLayoutsService.findByUuid).mockResolvedValue(null);
  vi.mocked(cmsLayoutsService.findPage).mockResolvedValue({
    hasNextPage: false,
    items: [],
    totalCount: 0,
  });

  return {
    cmsLayoutsService,
    cmsWriteAccessService,
    resolver: new CmsLayoutsResolver(cmsLayoutsService, cmsWriteAccessService),
  };
};

describe('CmsLayoutsResolver', () => {
  describe('when the caller may not write cms content', () => {
    it('reads every layout query for the public audience', async () => {
      const { cmsLayoutsService, cmsWriteAccessService, resolver } =
        buildResolver(false);

      await resolver.cmsLayout('home', REQUEST);
      await resolver.cmsLayoutByUuid('uuid-1', REQUEST);
      await resolver.cmsLayouts(null, null, REQUEST);

      expect(cmsWriteAccessService.canWrite).toHaveBeenCalledWith(REQUEST);
      expect(cmsLayoutsService.findBySlug).toHaveBeenCalledWith(
        'home',
        'public',
      );
      expect(cmsLayoutsService.findByUuid).toHaveBeenCalledWith(
        'uuid-1',
        'public',
      );
      expect(cmsLayoutsService.findPage).toHaveBeenCalledWith(
        expect.any(Object),
        'public',
      );
    });
  });

  describe('when the caller may write cms content', () => {
    it('reads every layout query for the editor audience', async () => {
      const { cmsLayoutsService, resolver } = buildResolver(true);

      await resolver.cmsLayout('home', REQUEST);
      await resolver.cmsLayoutByUuid('uuid-1', REQUEST);
      await resolver.cmsLayouts(null, null, REQUEST);

      expect(cmsLayoutsService.findBySlug).toHaveBeenCalledWith(
        'home',
        'editor',
      );
      expect(cmsLayoutsService.findByUuid).toHaveBeenCalledWith(
        'uuid-1',
        'editor',
      );
      expect(cmsLayoutsService.findPage).toHaveBeenCalledWith(
        expect.any(Object),
        'editor',
      );
    });
  });
});
