import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/layouts._index';
import { CmsLayoutsDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../layouts._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/layouts');

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/layouts',
    request: new Request(url),
    url,
  };
};

const buildPage = (items: readonly unknown[]) => {
  return { hasNextPage: false, items, totalCount: items.length };
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: async () => loader(buildLoaderArgs()),
      path: '/layouts',
    },
  ]);

  return render(<Stub initialEntries={['/layouts']} />);
};

describe('routes/layouts._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries cmsLayouts and returns the page', async () => {
      const page = buildPage([
        {
          createdAt: '2026-11-01T00:00:00.000Z',
          name: 'Welcome',
          slug: 'welcome',
          status: 'ACTIVE',
          tags: ['home'],
          updatedAt: '2026-11-02T00:00:00.000Z',
          uuid: 'layout-1',
        },
      ]);

      fetchPublicGraphql.mockResolvedValue({ cmsLayouts: page });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({
        cmsLayouts: page,
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(CmsLayoutsDocument);
    });
  });

  describe('with rows', () => {
    test('renders the heading and a table row per item', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLayouts: buildPage([
          {
            createdAt: '2026-11-01T00:00:00.000Z',
            name: 'Welcome',
            slug: 'welcome',
            status: 'ACTIVE',
            tags: ['home'],
            updatedAt: '2026-11-02T00:00:00.000Z',
            uuid: 'layout-1',
          },
        ]),
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByText('Welcome')).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
    });
  });

  describe('without rows', () => {
    test('renders the empty state', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLayouts: buildPage([]) });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
      expect(component.getByTestId('GlobalTable')).toBeInTheDocument();
    });
  });
});
