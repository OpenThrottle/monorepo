import { getLoginHref } from '@openthrottle/react-router-auth';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createMemoryRouter,
  createRoutesStub,
  RouterProvider,
} from 'react-router';
import { describe, expect, test } from 'vitest';

import type { CmsComponentDetailFragment } from '~/__generated__/graphql';
import { AUTH_ROUTES } from '~/routing/auth/data/routes';
import {
  COMPONENT_EDITOR_COPY,
  COMPONENT_PREVIEW_COPY,
} from '~/routing/components/data/copy';
import type { ComponentActionResult } from '~/routing/components/types/component-action';

import { ComponentEditor } from '../ComponentEditor';

const COMPONENT: CmsComponentDetailFragment = {
  code: 'export const Hero = () => null;',
  libraryUuid: 'library-1',
  name: 'Hero',
  propsSchemaJson: '{"type":"object"}',
  status: 'ACTIVE',
  typename: 'Hero',
  uuid: 'component-1',
};

const renderEditor = (result: ComponentActionResult | undefined) => {
  const submitted: FormData[] = [];
  const Component = () => {
    return (
      <ComponentEditor
        className={undefined}
        component={COMPONENT}
        result={result}
      />
    );
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        submitted.push(await request.formData());

        return null;
      },
      path: '/components/:uuid',
    },
  ]);
  const component = render(
    <RoutesStub initialEntries={['/components/component-1']} />,
  );

  return { component, submitted };
};

describe('ComponentEditor', () => {
  test('renders the selected status label in the server markup', () => {
    const router = createMemoryRouter(
      [
        {
          element: (
            <ComponentEditor
              className={undefined}
              component={COMPONENT}
              result={undefined}
            />
          ),
          path: '*',
        },
      ],
      { initialEntries: ['/components/component-1'] },
    );

    const html = renderToString(<RouterProvider router={router} />);

    expect(html).toContain('>ACTIVE<');
  });

  describe('before any save', () => {
    test('prefills every field from the component', () => {
      const { component } = renderEditor(undefined);

      expect(
        component.getByLabelText(COMPONENT_EDITOR_COPY.nameLabel),
      ).toHaveValue('Hero');
      expect(
        component.getByLabelText(COMPONENT_EDITOR_COPY.typenameLabel),
      ).toHaveValue('Hero');
      expect(
        component.getByLabelText(COMPONENT_EDITOR_COPY.codeLabel),
      ).toHaveValue(COMPONENT.code);
      expect(
        component.getByLabelText(COMPONENT_EDITOR_COPY.propsSchemaLabel),
      ).toHaveValue('{\n  "type": "object"\n}');
      expect(component.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('posts every field on save', async () => {
      const { component, submitted } = renderEditor(undefined);
      const name = component.getByLabelText(COMPONENT_EDITOR_COPY.nameLabel);

      await userEvent.clear(name);
      await userEvent.type(name, 'Banner');
      await userEvent.click(
        component.getByRole('button', { name: COMPONENT_EDITOR_COPY.save }),
      );

      await waitFor(() => {
        expect(submitted).toHaveLength(1);
      });
      expect(Object.fromEntries(submitted[0] ?? new FormData())).toEqual({
        code: COMPONENT.code,
        name: 'Banner',
        propsSchemaJson: '{\n  "type": "object"\n}',
        status: 'ACTIVE',
        typename: 'Hero',
      });
    });
  });

  describe('while editing the props schema', () => {
    test('updates the preview without saving', async () => {
      const { component, submitted } = renderEditor(undefined);
      const textarea = component.getByLabelText(
        COMPONENT_EDITOR_COPY.propsSchemaLabel,
      );

      expect(
        component.getByText(COMPONENT_PREVIEW_COPY.empty),
      ).toBeInTheDocument();

      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'not json');

      expect(component.getByRole('alert')).toHaveTextContent(
        COMPONENT_PREVIEW_COPY['invalid-json'],
      );

      await userEvent.clear(textarea);
      await userEvent.paste(
        JSON.stringify({ properties: { title: { type: 'string' } } }),
      );

      expect(component.queryByRole('alert')).not.toBeInTheDocument();
      expect(component.getByText('title')).toBeInTheDocument();
      expect(submitted).toHaveLength(0);
    });
  });

  describe('after a refused save', () => {
    test('lists the server issues', () => {
      const { component } = renderEditor({
        issues: [{ message: 'unknown keyword "typ"', path: '' }],
        message: COMPONENT_EDITOR_COPY.invalid,
        ok: false,
        requiresSignIn: false,
      });

      expect(component.getByRole('alert')).toHaveTextContent(
        COMPONENT_EDITOR_COPY.invalid,
      );
      expect(component.getByRole('listitem')).toHaveTextContent(
        `${COMPONENT_EDITOR_COPY.rootPath} unknown keyword "typ"`,
      );
    });

    test('offers a sign-in link back to this page when signed out', () => {
      const { component } = renderEditor({
        issues: [],
        message: COMPONENT_EDITOR_COPY.unauthenticated,
        ok: false,
        requiresSignIn: true,
      });

      expect(
        component.getByRole('link', { name: COMPONENT_EDITOR_COPY.signIn }),
      ).toHaveAttribute(
        'href',
        getLoginHref('/components/component-1', AUTH_ROUTES.signIn),
      );
    });
  });

  describe('after a successful save', () => {
    test('says so', () => {
      const { component } = renderEditor({ ok: true });

      expect(component.getByRole('status')).toHaveTextContent(
        COMPONENT_EDITOR_COPY.saved,
      );
    });
  });
});
