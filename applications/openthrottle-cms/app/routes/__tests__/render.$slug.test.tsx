import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/render.$slug';
import { RenderCmsLayoutDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../render.$slug');

const buildLoaderArgs = (slug: string): Route.LoaderArgs => {
  const url = new URL(`http://localhost/render/${slug}`);

  return {
    context: createTestRouterContext(),
    params: { slug },
    pattern: '/render/:slug',
    request: new Request(url),
    url,
  };
};

const SEEDED_LAYOUT = {
  fragments: [
    {
      childKeys: ['r/h'],
      key: 'r',
      parentKey: null,
      propertiesJson: '{}',
      typename: 'Layout',
      uuid: 'r',
    },
    {
      childKeys: [],
      key: 'r/h',
      parentKey: 'r',
      propertiesJson: '{"copy":"Hello","heading":"h1"}',
      typename: 'Heading',
      uuid: 'h',
    },
  ],
  name: 'Welcome',
  slug: 'welcome',
  uuid: 'layout',
};

describe('routes/render.$slug.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    describe('when the layout exists', () => {
      test('queries cmsLayout by slug and returns the fragment tree', async () => {
        fetchPublicGraphql.mockResolvedValue({ cmsLayout: SEEDED_LAYOUT });

        const result = await loader(buildLoaderArgs('welcome'));

        expect(fetchPublicGraphql).toHaveBeenCalledWith(
          RenderCmsLayoutDocument,
          { slug: 'welcome' },
        );
        expect(result.fragments).toHaveLength(1);
        expect(result.fragments[0]?.children[0]).toMatchObject({
          properties: { copy: 'Hello', heading: 'h1' },
          typename: 'Heading',
        });
      });
    });

    describe('when no live layout has the slug', () => {
      test('throws a 404 response', async () => {
        fetchPublicGraphql.mockResolvedValue({ cmsLayout: null });

        await expect(loader(buildLoaderArgs('missing'))).rejects.toMatchObject({
          init: { status: 404 },
        });
      });
    });

    describe('when the API fails', () => {
      test('throws a 502 response', async () => {
        fetchPublicGraphql.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(loader(buildLoaderArgs('welcome'))).rejects.toMatchObject({
          init: { status: 502 },
        });
      });
    });
  });

  describe('Component', () => {
    test('renders the layout blocks', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLayout: SEEDED_LAYOUT });
      const loaderData = await loader(buildLoaderArgs('welcome'));
      const Stub = createRoutesStub([
        { Component, loader: () => loaderData, path: '/render/:slug' },
      ]);
      const component = render(<Stub initialEntries={['/render/welcome']} />);

      expect(await component.findByTestId('CmsLayoutPage')).toBeInTheDocument();
      expect(component.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });
});
