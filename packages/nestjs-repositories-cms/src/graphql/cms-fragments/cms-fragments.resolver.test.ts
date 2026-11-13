import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import { fragmentsFactory } from '../../modules/fragments/fragments.factory.ts';
import { toCmsFragmentObject } from './cms-fragments.mapper.ts';
import { CmsFragmentsResolver } from './cms-fragments.resolver.ts';
import type { CmsFragmentsService } from './cms-fragments.service.ts';

const buildResolver = () => {
  const service = createMock<CmsFragmentsService>();

  vi.mocked(service.findPage).mockResolvedValue({
    hasNextPage: false,
    items: [],
    totalCount: 0,
  });

  return { resolver: new CmsFragmentsResolver(service), service };
};

describe('CmsFragmentsResolver', () => {
  describe('cmsFragments', () => {
    it('passes default paging to the service when skip and take are omitted', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsFragments(null, null, null, null);

      expect(service.findPage).toHaveBeenCalledWith({
        isSystem: null,
        skip: 0,
        take: 25,
        typename: null,
      });
    });

    it('passes filters and paging through', async () => {
      const { resolver, service } = buildResolver();

      await resolver.cmsFragments('Heading', false, 50, 10);

      expect(service.findPage).toHaveBeenCalledWith({
        isSystem: false,
        skip: 50,
        take: 10,
        typename: 'Heading',
      });
    });
  });

  describe('cmsFragment', () => {
    it('returns the service result for a uuid', async () => {
      const { resolver, service } = buildResolver();
      const fragment = toCmsFragmentObject(fragmentsFactory.build());

      vi.mocked(service.findByUuid).mockResolvedValue(fragment);

      await expect(resolver.cmsFragment(fragment.uuid)).resolves.toBe(fragment);
      expect(service.findByUuid).toHaveBeenCalledWith(fragment.uuid);
    });

    it('returns null when none matches', async () => {
      const { resolver, service } = buildResolver();

      vi.mocked(service.findByUuid).mockResolvedValue(null);

      await expect(resolver.cmsFragment('missing')).resolves.toBeNull();
    });
  });
});
