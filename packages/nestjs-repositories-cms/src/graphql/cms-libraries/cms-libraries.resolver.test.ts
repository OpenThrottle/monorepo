import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import { librariesFactory } from '../../modules/libraries/libraries.factory.ts';
import { toCmsLibraryObject } from './cms-libraries.mapper.ts';
import { CmsLibrariesResolver } from './cms-libraries.resolver.ts';
import type { CmsLibrariesService } from './cms-libraries.service.ts';

const buildResolver = () => {
  const service = createMock<CmsLibrariesService>();

  return { resolver: new CmsLibrariesResolver(service), service };
};

describe('CmsLibrariesResolver', () => {
  describe('cmsLibrary', () => {
    it('returns the service result for a uuid', async () => {
      const { resolver, service } = buildResolver();
      const library = toCmsLibraryObject(librariesFactory.build(), []);

      vi.mocked(service.findByUuid).mockResolvedValue(library);

      await expect(resolver.cmsLibrary(library.uuid)).resolves.toBe(library);
      expect(service.findByUuid).toHaveBeenCalledWith(library.uuid);
    });

    it('returns null when none matches', async () => {
      const { resolver, service } = buildResolver();

      vi.mocked(service.findByUuid).mockResolvedValue(null);

      await expect(resolver.cmsLibrary('missing')).resolves.toBeNull();
    });
  });
});
