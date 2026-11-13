import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/libraries._index';
import { CmsLibrariesDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../libraries._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/libraries');

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/libraries',
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
      path: '/libraries',
    },
  ]);

  return render(<Stub initialEntries={['/libraries']} />);
};

describe('routes/libraries._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries cmsLibraries and returns the page', async () => {
      const page = buildPage([
        {
          description: 'Core blocks',
          name: 'Core',
          status: 'ACTIVE',
          updatedAt: '2026-11-02T00:00:00.000Z',
          uuid: 'library-1',
        },
      ]);

      fetchPublicGraphql.mockResolvedValue({ cmsLibraries: page });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({
        cmsLibraries: page,
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(CmsLibrariesDocument);
    });
  });

  describe('with rows', () => {
    test('renders the heading and a table row per item', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLibraries: buildPage([
          {
            description: 'Core blocks',
            name: 'Core',
            status: 'ACTIVE',
            updatedAt: '2026-11-02T00:00:00.000Z',
            uuid: 'library-1',
          },
        ]),
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByText('Core blocks')).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/libraries/library-1',
      );
    });
  });

  describe('without rows', () => {
    test('renders the empty state', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLibraries: buildPage([]) });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
      expect(component.getByTestId('GlobalTable')).toBeInTheDocument();
    });
  });
});
