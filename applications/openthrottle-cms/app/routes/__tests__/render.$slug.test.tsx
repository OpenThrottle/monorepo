import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/render.$slug';
import { RenderCmsLayoutDocument } from '~/__generated__/graphql';

const fetchAuthGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchAuthGraphql }));

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
  status: 'ACTIVE',
  uuid: 'layout',
};

describe('routes/render.$slug.tsx', () => {
  beforeEach(() => {
    fetchAuthGraphql.mockReset();
  });

  describe('loader', () => {
    describe('when an ACTIVE layout has the slug', () => {
      test('queries cmsLayout as the visitor and returns the fragment tree, cacheable', async () => {
        fetchAuthGraphql.mockResolvedValue({ cmsLayout: SEEDED_LAYOUT });

        const result = await loader(buildLoaderArgs('welcome'));

        expect(fetchAuthGraphql).toHaveBeenCalledWith(
          expect.any(Request),
          RenderCmsLayoutDocument,
          { slug: 'welcome' },
        );
        expect(result.data.fragments).toHaveLength(1);
        expect(result.data.fragments[0]?.children[0]).toMatchObject({
          properties: { copy: 'Hello', heading: 'h1' },
          typename: 'Heading',
        });
        expect(result.init).toBeNull();
      });
    });

    describe('when an editor previews a DRAFT layout', () => {
      test('renders it and keeps it out of shared caches', async () => {
        fetchAuthGraphql.mockResolvedValue({
          cmsLayout: { ...SEEDED_LAYOUT, status: 'DRAFT' },
        });

        const result = await loader(buildLoaderArgs('welcome'));

        expect(result.data.fragments).toHaveLength(1);
        expect(result.init).toMatchObject({
          headers: { 'Cache-Control': 'private, no-store' },
        });
      });
    });

    describe('when no layout the visitor may see has the slug', () => {
      // The server returns null for a DRAFT or DISABLED slug unless the caller may write cms
      // content, so the public gets the same 404 as for an unknown slug.
      test('throws a 404 response', async () => {
        fetchAuthGraphql.mockResolvedValue({ cmsLayout: null });

        await expect(loader(buildLoaderArgs('missing'))).rejects.toMatchObject({
          init: { status: 404 },
        });
      });
    });

    describe('when the API fails', () => {
      test('throws a 502 response', async () => {
        fetchAuthGraphql.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(loader(buildLoaderArgs('welcome'))).rejects.toMatchObject({
          init: { status: 502 },
        });
      });
    });
  });

  describe('Component', () => {
    test('renders the layout blocks', async () => {
      fetchAuthGraphql.mockResolvedValue({ cmsLayout: SEEDED_LAYOUT });
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
