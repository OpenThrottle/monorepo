import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/schemas.$uuid._index';
import { CmsSchemaDetailDocument } from '~/__generated__/graphql';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({ fetchPublicGraphql }));

const { default: Component, loader } = await import('../schemas.$uuid._index');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const url = new URL('http://localhost/schemas/schema-1');

  return {
    context: createTestRouterContext(),
    params: { uuid: 'schema-1' },
    pattern: '/schemas/:uuid',
    request: new Request(url),
    url,
  };
};

const buildSchema = () => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    jsonSchemaJson: '{"type":"object"}',
    status: 'ACTIVE',
    typename: 'Heading',
    updatedAt: '2026-11-02T00:00:00.000Z',
    uuid: 'schema-1',
    version: 'abc123',
  };
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: async () => loader(buildLoaderArgs()),
      path: '/schemas/:uuid',
    },
  ]);

  return render(<Stub initialEntries={['/schemas/schema-1']} />);
};

describe('routes/schemas.$uuid._index.tsx', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('queries the schema by uuid and returns it', async () => {
      const cmsSchema = buildSchema();

      fetchPublicGraphql.mockResolvedValue({ cmsSchema });

      await expect(loader(buildLoaderArgs())).resolves.toEqual({ cmsSchema });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(CmsSchemaDetailDocument, {
        uuid: 'schema-1',
      });
    });

    test('throws a 404 when the schema does not exist', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsSchema: null });

      const thrown = await loader(buildLoaderArgs()).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });

  describe('with a schema', () => {
    test('renders the heading, detail list and definition block', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsSchema: buildSchema() });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByTestId('GlobalDetailList')).toBeInTheDocument();
      expect(component.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(component.container.querySelector('pre code')).toHaveTextContent(
        '"type": "object"',
      );
    });
  });
});
