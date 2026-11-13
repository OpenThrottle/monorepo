import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/layouts.$layoutUUID._index';
import { CmsLayoutDetailDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } =
  await import('../layouts.$layoutUUID._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/layouts/layout-1');

  return {
    context: createTestRouterContext(),
    params: { layoutUUID: 'layout-1' },
    pattern: '/layouts/:layoutUUID',
    request: new Request(url),
    url,
  };
};

const buildLayout = () => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    fragments: [
      {
        childKeys: ['root-1/hero-1'],
        depth: 0,
        key: 'root-1',
        name: 'Root',
        parentKey: null,
        propertiesJson: '{}',
        typename: 'Container',
        uuid: 'root-1',
      },
      {
        childKeys: [],
        depth: 1,
        key: 'root-1/hero-1',
        name: 'Hero',
        parentKey: 'root-1',
        propertiesJson: '{"title":"Hello"}',
        typename: 'Hero',
        uuid: 'hero-1',
      },
    ],
    name: 'Welcome',
    slug: 'welcome',
    status: 'ACTIVE',
    tags: ['home'],
    updatedAt: '2026-11-02T00:00:00.000Z',
    uuid: 'layout-1',
  };
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: async () => loader(buildLoaderArgs()),
      path: '/layouts/:layoutUUID',
    },
  ]);

  return render(<Stub initialEntries={['/layouts/layout-1']} />);
};

describe('routes/layouts.$layoutUUID._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries the layout by uuid and returns it with its fragment tree', async () => {
      const cmsLayout = buildLayout();

      fetchPublicGraphql.mockResolvedValue({ cmsLayoutByUuid: cmsLayout });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({
        cmsLayout,
        fragments: [
          {
            children: [
              {
                children: [],
                properties: { title: 'Hello' },
                typename: 'Hero',
                uuid: 'hero-1',
              },
            ],
            properties: {},
            typename: 'Container',
            uuid: 'root-1',
          },
        ],
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(CmsLayoutDetailDocument, {
        uuid: 'layout-1',
      });
    });

    test('throws a 404 when the layout does not exist', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLayoutByUuid: null });

      const thrown = await loader(buildLoaderArgs()).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });

  describe('with a layout', () => {
    test('renders the heading, detail list and fragment links', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLayoutByUuid: buildLayout() });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByTestId('GlobalDetailList')).toBeInTheDocument();
      expect(component.getAllByRole('heading', { level: 2 })).toHaveLength(2);

      const links = component.getAllByRole('link');
      const hrefs = links.map((link) => link.getAttribute('href'));

      expect(hrefs).toEqual(['/fragments/root-1', '/fragments/hero-1']);
    });

    test('previews the fragment tree with the core renderer', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLayoutByUuid: buildLayout() });

      const component = renderRoute();

      expect(await component.findByTestId('CorePreviewFrame')).toContainElement(
        component.getByTestId('CoreRenderer'),
      );
      expect(component.queryByTestId('LayoutPreviewEmpty')).toBeNull();
    });
  });

  describe('with a layout that has no fragments', () => {
    test('shows the preview empty state instead of the renderer', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLayoutByUuid: { ...buildLayout(), fragments: [] },
      });

      const component = renderRoute();

      expect(
        await component.findByTestId('LayoutPreviewEmpty'),
      ).toBeInTheDocument();
      expect(component.queryByTestId('CoreRenderer')).toBeNull();
    });
  });
});
