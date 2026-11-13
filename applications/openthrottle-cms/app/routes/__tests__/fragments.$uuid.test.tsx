import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/fragments.$uuid';
import { CmsFragmentDetailDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../fragments.$uuid');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/fragments/fragment-1');

  return {
    context: createTestRouterContext(),
    params: { uuid: 'fragment-1' },
    pattern: '/fragments/:uuid',
    request: new Request(url),
    url,
  };
};

const buildFragment = () => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    isSystem: false,
    name: 'Hero heading',
    propertiesJson: '{"text":"Hello"}',
    schemaUuid: 'schema-1',
    typename: 'Heading',
    updatedAt: '2026-11-02T00:00:00.000Z',
    uuid: 'fragment-1',
  };
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: async () => loader(buildLoaderArgs()),
      path: '/fragments/:uuid',
    },
  ]);

  return render(<Stub initialEntries={['/fragments/fragment-1']} />);
};

describe('routes/fragments.$uuid.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries the fragment by uuid and returns it', async () => {
      const cmsFragment = buildFragment();

      fetchPublicGraphql.mockResolvedValue({ cmsFragment });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({ cmsFragment });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(
        CmsFragmentDetailDocument,
        { uuid: 'fragment-1' },
      );
    });

    test('throws a 404 when the fragment does not exist', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: null });

      const thrown = await loader(buildLoaderArgs()).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });

  describe('with a fragment', () => {
    test('renders the heading, detail list and data block', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: buildFragment() });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByTestId('GlobalDetailList')).toBeInTheDocument();
      expect(component.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(component.container.querySelector('pre code')).toHaveTextContent(
        '"text": "Hello"',
      );
    });
  });
});
