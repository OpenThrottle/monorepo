import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/components.$uuid';
import { CmsComponentDetailDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../components.$uuid');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/components/component-1');

  return {
    context: createTestRouterContext(),
    params: { uuid: 'component-1' },
    pattern: '/components/:uuid',
    request: new Request(url),
    url,
  };
};

const buildComponent = () => {
  return {
    code: 'export const Heading = () => null;',
    libraryUuid: 'library-1',
    name: 'Heading',
    propsSchemaJson: '{"type":"object"}',
    status: 'ACTIVE',
    typename: 'Heading',
    uuid: 'component-1',
  };
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: async () => loader(buildLoaderArgs()),
      path: '/components/:uuid',
    },
  ]);

  return render(<Stub initialEntries={['/components/component-1']} />);
};

describe('routes/components.$uuid.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries the component by uuid and returns it', async () => {
      const cmsComponent = buildComponent();

      fetchPublicGraphql.mockResolvedValue({
        cmsLibraryComponent: cmsComponent,
      });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({
        cmsComponent,
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(
        CmsComponentDetailDocument,
        { uuid: 'component-1' },
      );
    });

    test('throws a 404 when the component does not exist', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsLibraryComponent: null });

      const thrown = await loader(buildLoaderArgs()).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });

  describe('with a component', () => {
    test('renders the heading, detail list and a library link', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsLibraryComponent: buildComponent(),
      });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByTestId('GlobalDetailList')).toBeInTheDocument();
      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/libraries/library-1',
      );
      expect(component.container.querySelector('pre code')).toHaveTextContent(
        '"type": "object"',
      );
    });
  });
});
