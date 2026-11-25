import { GraphqlResponseError } from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/components.$uuid';
import {
  CmsComponentDetailDocument,
  UpdateCmsLibraryComponentDocument,
} from '~/__generated__/graphql';
import { COMPONENT_EDITOR_COPY } from '~/routing/components/data/copy';

const fetchAuthGraphql = vi.fn();
const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => ({
  fetchAuthGraphql,
  fetchPublicGraphql,
}));

const {
  action,
  default: Component,
  loader,
} = await import('../components.$uuid');

const FORM_FIELDS = {
  code: 'export const Heading = () => null;',
  name: 'Heading',
  propsSchemaJson: '{"type":"object"}',
  status: 'ACTIVE',
  typename: 'Heading',
};

const buildActionArgs = (fields: Record<string, string>): Route.ActionArgs => {
  const url = new URL('http://localhost/components/component-1');
  const body = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    body.set(key, value);
  });

  return {
    context: createTestRouterContext(),
    params: { uuid: 'component-1' },
    pattern: '/components/:uuid',
    request: new Request(url, { body, method: 'POST' }),
    url,
  };
};

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
    fetchAuthGraphql.mockReset();
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
      expect(component.getByTestId('ComponentEditor')).toBeInTheDocument();
    });
  });

  describe('action', () => {
    test('saves every posted field as the signed-in user', async () => {
      fetchAuthGraphql.mockResolvedValue({
        updateCmsLibraryComponent: { name: 'Heading', uuid: 'component-1' },
      });

      const args = buildActionArgs(FORM_FIELDS);

      await expect(action(args)).resolves.toEqual({ ok: true });
      expect(fetchAuthGraphql).toHaveBeenCalledWith(
        args.request,
        UpdateCmsLibraryComponentDocument,
        { input: { ...FORM_FIELDS, uuid: 'component-1' } },
      );
    });

    test('returns the strict-Ajv issues when the props schema does not compile', async () => {
      fetchAuthGraphql.mockRejectedValue(
        new GraphqlResponseError('propsSchemaJson is not a valid JSON Schema', {
          code: 'BAD_USER_INPUT',
          field: 'propsSchemaJson',
          issues: [
            {
              instancePath: '',
              message: 'strict mode: unknown keyword: "typ"',
            },
          ],
        }),
      );

      await expect(action(buildActionArgs(FORM_FIELDS))).resolves.toEqual({
        issues: [{ message: 'strict mode: unknown keyword: "typ"', path: '' }],
        message: COMPONENT_EDITOR_COPY.invalid,
        ok: false,
        requiresSignIn: false,
      });
    });

    test('asks for a sign-in when nobody is signed in', async () => {
      fetchAuthGraphql.mockRejectedValue(
        new GraphqlResponseError('no', { code: 'UNAUTHENTICATED' }),
      );

      await expect(action(buildActionArgs(FORM_FIELDS))).resolves.toMatchObject(
        {
          message: COMPONENT_EDITOR_COPY.unauthenticated,
          requiresSignIn: true,
        },
      );
    });

    test('refuses a malformed form without calling the server', async () => {
      await expect(
        action(buildActionArgs({ ...FORM_FIELDS, code: '' })),
      ).resolves.toMatchObject({
        message: COMPONENT_EDITOR_COPY.invalidForm,
        ok: false,
      });
      expect(fetchAuthGraphql).not.toHaveBeenCalled();
    });
  });
});
