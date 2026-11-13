import { GraphqlResponseError } from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, Link, Outlet } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/fragments.$uuid';
import {
  AddCmsFragmentChildDocument,
  CmsFragmentChildCandidatesDocument,
  CmsFragmentDetailDocument,
  RemoveCmsFragmentChildDocument,
  ReorderCmsFragmentChildrenDocument,
  UpdateCmsFragmentDocument,
} from '~/__generated__/graphql';
import {
  FRAGMENT_EDITOR_COPY,
  FRAGMENT_EDITOR_UNAVAILABLE_COPY,
} from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';

const fetchAuthGraphql = vi.fn();
const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => {
  return { fetchAuthGraphql, fetchPublicGraphql };
});

const {
  action,
  default: Component,
  loader,
} = await import('../fragments.$uuid');

const buildActionArgs = (fields: Record<string, string>): Route.ActionArgs => {
  const url = new URL('http://localhost/fragments/fragment-1');
  const body = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    body.set(key, value);
  });

  return {
    context: createTestRouterContext(),
    params: { uuid: 'fragment-1' },
    pattern: '/fragments/:uuid',
    request: new Request(url, { body, method: 'POST' }),
    url,
  };
};

const buildLoaderArgs = (uuid = 'fragment-1'): Route.LoaderArgs => {
  const url = new URL(`http://localhost/fragments/${uuid}`);

  return {
    context: createTestRouterContext(),
    params: { uuid },
    pattern: '/fragments/:uuid',
    request: new Request(url),
    url,
  };
};

const buildSchema = () => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    jsonSchemaJson: JSON.stringify({
      properties: { text: { type: 'string' } },
      type: 'object',
    }),
    status: 'ACTIVE',
    typename: 'Heading',
    updatedAt: '2026-11-01T00:00:00.000Z',
    uuid: 'schema-1',
    version: 'abc',
  };
};

const buildFragment = (uuid = 'fragment-1', text = 'Hello') => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    isSystem: false,
    name: `Heading ${uuid}`,
    propertiesJson: JSON.stringify({ text }),
    schema: buildSchema(),
    schemaUuid: 'schema-1',
    typename: 'Heading',
    updatedAt: '2026-11-02T00:00:00.000Z',
    uuid,
  };
};

const Nav = () => {
  return (
    <>
      <Link to="/fragments/fragment-2">next</Link>
      <Outlet />
    </>
  );
};

const renderRoute = () => {
  const Stub = createRoutesStub([
    {
      Component: Nav,
      children: [
        {
          Component,
          action: async (args) => {
            return action({ ...buildLoaderArgs(), request: args.request });
          },
          loader: async (args) => {
            return loader(buildLoaderArgs(args.params['uuid']));
          },
          path: '/fragments/:uuid',
        },
      ],
    },
  ]);

  return render(<Stub initialEntries={['/fragments/fragment-1']} />);
};

describe('routes/fragments.$uuid.tsx', () => {
  beforeEach(() => {
    fetchAuthGraphql.mockReset();
    fetchPublicGraphql.mockReset();
  });

  describe('action', () => {
    test('saves the name and properties through updateCmsFragment', async () => {
      fetchAuthGraphql.mockResolvedValue({ updateCmsFragment: {} });

      const args = buildActionArgs({
        intent: FRAGMENT_INTENT.UPDATE,
        name: ' Renamed ',
        properties: '{"text":"Hi"}',
      });

      await expect(action(args)).resolves.toEqual({
        intent: FRAGMENT_INTENT.UPDATE,
        ok: true,
      });
      expect(fetchAuthGraphql).toHaveBeenCalledWith(
        args.request,
        UpdateCmsFragmentDocument,
        {
          input: {
            name: 'Renamed',
            propertiesJson: '{"text":"Hi"}',
            uuid: 'fragment-1',
          },
        },
      );
    });

    test('maps BAD_USER_INPUT issues into the result', async () => {
      fetchAuthGraphql.mockRejectedValue(
        new GraphqlResponseError('GraphQL errors: invalid', {
          code: 'BAD_USER_INPUT',
          issues: [{ instancePath: '/text', message: 'must be string' }],
        }),
      );

      await expect(
        action(
          buildActionArgs({
            intent: FRAGMENT_INTENT.UPDATE,
            properties: '{"text":1}',
          }),
        ),
      ).resolves.toEqual({
        issues: [{ message: 'must be string', path: '/text' }],
        message: FRAGMENT_EDITOR_COPY.invalid,
        ok: false,
      });
    });

    test.each([
      [
        FRAGMENT_INTENT.ADD_CHILD,
        { childUuid: 'child-9' },
        AddCmsFragmentChildDocument,
        { childUuid: 'child-9', parentUuid: 'fragment-1' },
      ],
      [
        FRAGMENT_INTENT.REMOVE_CHILD,
        { childUuid: 'child-9' },
        RemoveCmsFragmentChildDocument,
        { childUuid: 'child-9', parentUuid: 'fragment-1' },
      ],
      [
        FRAGMENT_INTENT.REORDER_CHILDREN,
        { childUuids: '["b","a"]' },
        ReorderCmsFragmentChildrenDocument,
        { childUuids: ['b', 'a'], parentUuid: 'fragment-1' },
      ],
    ])(
      'runs %s against the child edge API',
      async (intent, fields, document, variables) => {
        fetchAuthGraphql.mockResolvedValue({});

        const args = buildActionArgs({ ...fields, intent });

        await expect(action(args)).resolves.toEqual({ intent, ok: true });
        expect(fetchAuthGraphql).toHaveBeenCalledWith(
          args.request,
          document,
          variables,
        );
      },
    );

    test.each([
      [FRAGMENT_INTENT.ADD_CHILD, {}],
      [FRAGMENT_INTENT.REMOVE_CHILD, { childUuid: '' }],
      [FRAGMENT_INTENT.REORDER_CHILDREN, { childUuids: '{"not":"a list"}' }],
    ])('refuses %s with a malformed form', async (intent, fields) => {
      const result = await action(buildActionArgs({ ...fields, intent }));

      expect(result).toEqual({
        issues: [],
        message: FRAGMENT_EDITOR_COPY.invalidForm,
        ok: false,
      });
      expect(fetchAuthGraphql).not.toHaveBeenCalled();
    });

    test('surfaces a CONFLICT from the edge API', async () => {
      fetchAuthGraphql.mockRejectedValue(
        new GraphqlResponseError('GraphQL errors: already a child', {
          code: 'CONFLICT',
        }),
      );

      await expect(
        action(
          buildActionArgs({
            childUuid: 'child-9',
            intent: FRAGMENT_INTENT.ADD_CHILD,
          }),
        ),
      ).resolves.toEqual({
        issues: [],
        message: 'GraphQL errors: already a child',
        ok: false,
      });
    });

    test('refuses an unknown intent without calling the server', async () => {
      const result = await action(buildActionArgs({ intent: 'nope' }));

      expect(result).toMatchObject({ ok: false });
      expect(fetchAuthGraphql).not.toHaveBeenCalled();
    });

    test('refuses an update with no properties', async () => {
      const result = await action(
        buildActionArgs({ intent: FRAGMENT_INTENT.UPDATE }),
      );

      expect(result).toEqual({
        issues: [],
        message: FRAGMENT_EDITOR_COPY.invalidForm,
        ok: false,
      });
    });
  });

  describe('loader', () => {
    test('queries the fragment with its schema and adapts both', async () => {
      const cmsFragment = buildFragment();

      fetchPublicGraphql.mockResolvedValue({ cmsFragment });

      const result = await loader(buildLoaderArgs());

      expect(result.cmsFragment).toBe(cmsFragment);
      expect(result.editor).toMatchObject({
        ok: true,
        value: { draft: { text: 'Hello' }, schema: { uuid: 'schema-1' } },
      });
      expect(fetchPublicGraphql).toHaveBeenCalledWith(
        CmsFragmentDetailDocument,
        { uuid: 'fragment-1' },
      );
    });

    test('skips the child candidates for a leaf fragment', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: buildFragment() });

      const result = await loader(buildLoaderArgs());

      expect(result.childCandidates).toEqual([]);
      expect(fetchPublicGraphql).toHaveBeenCalledTimes(1);
    });

    test('loads child candidates for a container, minus itself and its children', async () => {
      const grid = {
        ...buildFragment(),
        children: [{ ...buildFragment('child-1'), schema: undefined }],
        schema: {
          ...buildSchema(),
          jsonSchemaJson: JSON.stringify({
            properties: {
              children: { type: 'array', 'x-cms-widget': 'children' },
            },
            type: 'object',
          }),
        },
      };

      fetchPublicGraphql.mockImplementation(async (document) => {
        if (document === CmsFragmentChildCandidatesDocument) {
          return {
            cmsFragments: {
              items: [
                { name: 'Self', typename: 'Heading', uuid: 'fragment-1' },
                { name: 'Child', typename: 'Heading', uuid: 'child-1' },
                { name: 'Spare', typename: 'Heading', uuid: 'spare-1' },
              ],
            },
          };
        }

        return { cmsFragment: grid };
      });

      const result = await loader(buildLoaderArgs());

      expect(result.childCandidates.map((item) => item.uuid)).toEqual([
        'spare-1',
      ]);
      expect(result.editor).toMatchObject({
        ok: true,
        value: { children: [{ uuid: 'child-1' }], hasChildren: true },
      });
    });

    test('throws a 404 when the fragment does not exist', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: null });

      const thrown = await loader(buildLoaderArgs()).catch(
        (error: unknown) => error,
      );

      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });

  describe('with a fragment and its schema', () => {
    test('renders the heading, detail list and editor', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: buildFragment() });

      const component = renderRoute();

      expect(
        await component.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(component.getByTestId('GlobalDetailList')).toBeInTheDocument();
      expect(component.getByTestId('FragmentEditor')).toBeInTheDocument();
      expect(component.getByRole('textbox', { name: 'text' })).toHaveValue(
        'Hello',
      );
    });

    test('starts the next fragment from its own properties, not the last draft', async () => {
      fetchPublicGraphql.mockImplementation(async (_document, variables) => {
        const isFirst = variables.uuid === 'fragment-1';

        return {
          cmsFragment: buildFragment(variables.uuid, isFirst ? 'One' : 'Two'),
        };
      });

      const component = renderRoute();
      const field = await component.findByRole('textbox', { name: 'text' });

      await userEvent.type(field, ' edited');
      expect(field).toHaveValue('One edited');

      await userEvent.click(component.getByRole('link', { name: 'next' }));

      expect(
        await component.findByRole('heading', {
          level: 1,
          name: /fragment-2/,
        }),
      ).toBeInTheDocument();
      expect(component.getByRole('textbox', { name: 'text' })).toHaveValue(
        'Two',
      );
    });
  });

  describe('saving from the form', () => {
    test('posts the edited draft and shows the server issues', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: buildFragment() });
      fetchAuthGraphql.mockRejectedValue(
        new GraphqlResponseError('GraphQL errors: invalid', {
          code: 'BAD_USER_INPUT',
          issues: [{ instancePath: '/text', message: 'is too short' }],
        }),
      );

      const component = renderRoute();
      const field = await component.findByRole('textbox', { name: 'text' });

      await userEvent.clear(field);
      await userEvent.type(field, 'x');
      await userEvent.click(component.getByRole('button', { name: 'Save' }));

      expect(await component.findByRole('alert')).toHaveTextContent(
        'is too short',
      );
      const [, , variables] = fetchAuthGraphql.mock.calls[0] ?? [];
      expect(variables).toMatchObject({
        input: { propertiesJson: '{"text":"x"}', uuid: 'fragment-1' },
      });
    });

    test('confirms a successful save', async () => {
      fetchPublicGraphql.mockResolvedValue({ cmsFragment: buildFragment() });
      fetchAuthGraphql.mockResolvedValue({ updateCmsFragment: {} });

      const component = renderRoute();

      await component.findByTestId('FragmentEditor');
      await userEvent.click(component.getByRole('button', { name: 'Save' }));

      expect(await component.findByRole('status')).toHaveTextContent(
        FRAGMENT_EDITOR_COPY.savedByIntent.updateFragment,
      );
    });
  });

  describe('without a usable schema', () => {
    test('explains why the editor is unavailable', async () => {
      fetchPublicGraphql.mockResolvedValue({
        cmsFragment: { ...buildFragment(), schema: null },
      });

      const component = renderRoute();

      expect(
        await component.findByText(
          FRAGMENT_EDITOR_UNAVAILABLE_COPY['missing-schema'],
        ),
      ).toBeInTheDocument();
      expect(component.queryByTestId('FragmentEditor')).toBeNull();
    });
  });
});
