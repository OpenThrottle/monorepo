import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/components._index';
import { CmsLibraryComponentsDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../components._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/components');

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/components',
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
      path: '/components',
    },
  ]);

  return render(<Stub initialEntries={['/components']} />);
};

describe('routes/components._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries cmsLibraryComponents and returns the page', async () => {
      const page = buildPage([
        {
          libraryUuid: 'library-1',
          name: 'Heading',
          status: 'ACTIVE',
          typename: 'Heading',
          uuid: 'component-1',
        },
      ]);

      fetchPublicGraphql.mockResolvedValue({ cmsLibraryComponents: page });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({
        cmsLibraryComponents: page,
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(
        CmsLibraryComponentsDocument,
      );
    });
  });

  describe('with rows', () => {
    test('renders the heading and a table row per item', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLibraryComponents: buildPage([
          {
            libraryUuid: 'library-1',
            name: 'Heading',
            status: 'ACTIVE',
            typename: 'Heading',
            uuid: 'component-1',
          },
        ]),
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByText('library-1')).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
    });

    test('links each row to its component detail route', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLibraryComponents: buildPage([
          {
            libraryUuid: 'library-1',
            name: 'Heading',
            status: 'ACTIVE',
            typename: 'Heading',
            uuid: 'component-1',
          },
        ]),
      });

      const component = renderRoute();

      await component.findByRole('heading', { level: 1 });

      const hrefs = component
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'));

      expect(hrefs).toContain('/components/component-1');
    });
  });

  describe('without rows', () => {
    test('renders the empty state', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLibraryComponents: buildPage([]),
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
      expect(component.getByTestId('GlobalTable')).toBeInTheDocument();
    });
  });
});
