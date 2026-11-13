import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/libraries.$libraryUUID._index';
import { CmsLibraryDetailDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } =
  await import('../libraries.$libraryUUID._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/libraries/library-1');

  return {
    context: createTestRouterContext(),
    params: { libraryUUID: 'library-1' },
    pattern: '/libraries/:libraryUUID',
    request: new Request(url),
    url,
  };
};

const buildLibrary = () => {
  return {
    components: [
      {
        libraryUuid: 'library-1',
        name: 'Heading',
        status: 'ACTIVE',
        typename: 'Heading',
        uuid: 'component-1',
      },
    ],
    createdAt: '2026-11-01T00:00:00.000Z',
    description: 'Core blocks',
    name: 'Core',
    status: 'ACTIVE',
    updatedAt: '2026-11-02T00:00:00.000Z',
    uuid: 'library-1',
  };
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: async () => loader(buildLoaderArgs()),
      path: '/libraries/:libraryUUID',
    },
  ]);

  return render(<Stub initialEntries={['/libraries/library-1']} />);
};

describe('routes/libraries.$libraryUUID._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries the library by uuid and returns it', async () => {
      const cmsLibrary = buildLibrary();

      fetchPublicGraphql.mockResolvedValue({ cmsLibrary });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({ cmsLibrary });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(
        CmsLibraryDetailDocument,
        { uuid: 'library-1' },
      );
    });

    test('throws a 404 when the library does not exist', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLibrary: null });

      const thrown = await loader(buildLoaderArgs()).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });

  describe('with a library', () => {
    test('renders the heading, detail list and linked component rows', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLibrary: buildLibrary() });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByTestId('GlobalDetailList')).toBeInTheDocument();
      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/components/component-1',
      );
    });
  });

  describe('without components', () => {
    test('renders no component links', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLibrary: { ...buildLibrary(), components: [] },
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
