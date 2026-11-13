import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/schemas._index';
import { CmsSchemasDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../schemas._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/schemas');

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/schemas',
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
      path: '/schemas',
    },
  ]);

  return render(<Stub initialEntries={['/schemas']} />);
};

describe('routes/schemas._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries cmsSchemas and returns the page', async () => {
      const page = buildPage([
        {
          createdAt: '2026-11-01T00:00:00.000Z',
          status: 'ACTIVE',
          typename: 'Heading',
          updatedAt: '2026-11-02T00:00:00.000Z',
          uuid: 'schema-1',
          version: 'abc123',
        },
      ]);

      fetchPublicGraphql.mockResolvedValue({ cmsSchemas: page });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({
        cmsSchemas: page,
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(CmsSchemasDocument);
    });
  });

  describe('with rows', () => {
    test('renders the heading and a table row per item', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsSchemas: buildPage([
          {
            createdAt: '2026-11-01T00:00:00.000Z',
            status: 'ACTIVE',
            typename: 'Heading',
            updatedAt: '2026-11-02T00:00:00.000Z',
            uuid: 'schema-1',
            version: 'abc123',
          },
        ]),
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByText('abc123')).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
      expect(
        component
          .getAllByRole('link')
          .some((link) => link.getAttribute('href') === '/schemas/schema-1'),
      ).toBe(true);
    });
  });

  describe('without rows', () => {
    test('renders the empty state', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsSchemas: buildPage([]) });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getAllByRole('row')).toHaveLength(2);
      expect(component.getByTestId('GlobalTable')).toBeInTheDocument();
    });
  });
});
