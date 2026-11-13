import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { CORE_FORM_COPY, FORM_CHILDREN_COPY } from '../../data/data.copy';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { MOCK_FRAGMENT_RECORDS } from '../../data/mock.fragment-records';
import type { CmsParsedSchema } from '../../types/cms-json-schema';
import type { CmsFormChildren, CmsFormIssues } from '../../types/cms-render';
import { CoreFormRenderer } from '../CoreFormRenderer';

const withChildren: CmsParsedSchema = {
  ...MOCK_FORM_SCHEMA,
  json_schema: {
    properties: { items: { type: 'children' }, nothing: { type: 'null' } },
    type: 'object',
  },
};

const bindings: CmsFormChildren = {
  addHref: '/add',
  fragments: MOCK_FRAGMENT_RECORDS,
  getFragmentHref: (fragment) => `/edit/${fragment.uuid}`,
  onDrop: undefined,
  onRemove: vi.fn(),
  onReorder: vi.fn(),
};

const renderForm = (
  schema: CmsParsedSchema,
  children: CmsFormChildren | undefined,
  issues: CmsFormIssues | undefined = undefined,
) => {
  const store = createStore();
  store.set(atomFragmentDraft, { title: 'Hello' });
  const submitted: FormData[] = [];
  const Component = () => {
    return (
      <Provider store={store}>
        <DndProvider backend={HTML5Backend}>
          <CoreFormRenderer
            children={children}
            className={undefined}
            fragmentUuid="fragment-1"
            header={<input defaultValue="Hero" name="name" />}
            intent="updateFragment"
            issues={issues}
            schema={schema}
          />
        </DndProvider>
      </Provider>
    );
  };
  const action = async (args: { readonly request: Request }) => {
    submitted.push(await args.request.formData());
    return null;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return { component: render(<RoutesStub />), submitted };
};

describe('CoreFormRenderer', () => {
  test('renders one pane per property, the first open', () => {
    const { component } = renderForm(MOCK_FORM_SCHEMA, undefined);
    const keys = Object.keys(MOCK_FORM_SCHEMA.json_schema.properties ?? {});

    keys.forEach((key) => {
      expect(
        component.getByRole('button', { name: new RegExp(`^${key}`) }),
      ).toBeInTheDocument();
    });
    expect(component.getByText('A button or plain text')).toBeVisible();
  });

  test('maps a property to its field once its pane opens', async () => {
    const { component } = renderForm(MOCK_FORM_SCHEMA, undefined);

    await userEvent.click(component.getByRole('button', { name: /^size/ }));

    expect(
      component.getByRole('combobox', { name: 'size' }),
    ).toBeInTheDocument();
  });

  test('submits the draft and the hidden fields', async () => {
    const { component, submitted } = renderForm(MOCK_FORM_SCHEMA, undefined);

    await userEvent.click(
      component.getByRole('button', { name: CORE_FORM_COPY.save }),
    );

    await waitFor(() => {
      expect(submitted).toHaveLength(1);
    });
    const [data] = submitted;
    expect(data?.get('intent')).toBe('updateFragment');
    expect(data?.get('fragment_uuid')).toBe('fragment-1');
    expect(data?.get('properties')).toBe(JSON.stringify({ title: 'Hello' }));
    expect(data?.get('typename')).toBe('Mock');
    expect(data?.get('name')).toBe('Hero');
  });

  test('flags the pane of a property with issues', async () => {
    const { component } = renderForm(MOCK_FORM_SCHEMA, undefined, {
      size: ['must be equal to one of the allowed values'],
    });
    const trigger = component.getByRole('button', { name: /^size/ });

    expect(trigger).toHaveAttribute('aria-invalid', 'true');

    await userEvent.click(trigger);

    expect(
      component.getByText('must be equal to one of the allowed values'),
    ).toBeVisible();
  });

  describe('for a children property', () => {
    test('renders the children field from the bindings', () => {
      const { component } = renderForm(withChildren, bindings);

      expect(
        component.getByRole('link', { name: FORM_CHILDREN_COPY.add }),
      ).toBeInTheDocument();
    });

    test('renders no field without bindings', () => {
      const { component } = renderForm(withChildren, undefined);

      expect(
        component.queryByRole('link', { name: FORM_CHILDREN_COPY.add }),
      ).toBeNull();
    });
  });
});
