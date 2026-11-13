import {
  CORE_FORM_COPY,
  FORM_CHILDREN_COPY,
} from '@openthrottle/react-router-cms-core';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import {
  MOCK_CONTAINER_EDITOR_RECORDS,
  MOCK_FRAGMENT_EDITOR_RECORDS,
} from '~/routing/fragments/data/mock.fragment-editor';
import type { FragmentActionResult } from '~/routing/fragments/types/fragment-action';
import type { CmsFragmentEditorRecords } from '~/routing/fragments/utils/to-cms-records';

import { FragmentEditor } from '../FragmentEditor';

const renderEditor = (
  records: CmsFragmentEditorRecords,
  result: FragmentActionResult | undefined = undefined,
) => {
  const submitted: FormData[] = [];
  const Component = () => {
    return (
      <DndProvider backend={HTML5Backend}>
        <Provider key={records.fragment.uuid}>
          <FragmentEditor
            childCandidates={[
              { name: 'Spare', typename: 'Heading', uuid: 'spare-1' },
            ]}
            className={undefined}
            records={records}
            result={result}
          />
        </Provider>
      </DndProvider>
    );
  };
  const action = async (args: { readonly request: Request }) => {
    submitted.push(await args.request.formData());
    return null;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return { component: render(<RoutesStub />), submitted };
};

describe('FragmentEditor', () => {
  test('renders a pane per schema property', () => {
    const { component } = renderEditor(MOCK_FRAGMENT_EDITOR_RECORDS);

    expect(
      component.getByRole('button', { name: /^copy/ }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /^heading/ }),
    ).toBeInTheDocument();
  });

  test('seeds the draft with the stored properties and posts the update intent', async () => {
    const { component, submitted } = renderEditor(MOCK_FRAGMENT_EDITOR_RECORDS);

    await userEvent.click(
      component.getByRole('button', { name: CORE_FORM_COPY.save }),
    );

    await waitFor(() => {
      expect(submitted).toHaveLength(1);
    });
    expect(submitted[0]?.get('intent')).toBe(FRAGMENT_INTENT.UPDATE);
    expect(submitted[0]?.get('fragment_uuid')).toBe('fragment-1');
    expect(submitted[0]?.get('properties')).toBe(
      JSON.stringify(MOCK_FRAGMENT_EDITOR_RECORDS.draft),
    );
    expect(submitted[0]?.get('name')).toBe('Hero heading');
  });

  describe('after a successful save', () => {
    test('confirms it', () => {
      const { component } = renderEditor(MOCK_FRAGMENT_EDITOR_RECORDS, {
        intent: FRAGMENT_INTENT.UPDATE,
        ok: true,
      });

      expect(component.getByRole('status')).toHaveTextContent(
        FRAGMENT_EDITOR_COPY.savedByIntent.updateFragment,
      );
    });
  });

  describe('after a failed save', () => {
    test('lists the issues and flags the matching pane', () => {
      const { component } = renderEditor(MOCK_FRAGMENT_EDITOR_RECORDS, {
        issues: [
          {
            message: 'must be equal to one of the allowed values',
            path: '/heading',
          },
          { message: "must have required property 'copy'", path: '' },
        ],
        message: FRAGMENT_EDITOR_COPY.invalid,
        ok: false,
      });
      const alert = component.getByRole('alert');

      expect(alert).toHaveTextContent(FRAGMENT_EDITOR_COPY.invalid);
      expect(alert).toHaveTextContent('/heading');
      expect(alert).toHaveTextContent(FRAGMENT_EDITOR_COPY.rootPath);
      expect(
        component.getByRole('button', { name: /^heading/ }),
      ).toHaveAttribute('aria-invalid', 'true');
      expect(component.getByRole('button', { name: /^copy/ })).toHaveAttribute(
        'aria-invalid',
        'false',
      );
    });
  });

  describe('for a leaf fragment', () => {
    test('renders no add-child form', () => {
      const { component } = renderEditor(MOCK_FRAGMENT_EDITOR_RECORDS);

      expect(component.queryByTestId('FragmentChildAdd')).toBeNull();
    });
  });

  describe('for a container fragment', () => {
    // `children` is the schema's first property, so its pane starts open.
    test('lists the children and links each to its edit page', () => {
      const { component } = renderEditor(MOCK_CONTAINER_EDITOR_RECORDS);

      expect(component.getByText('First child')).toBeInTheDocument();
      expect(
        component.getAllByRole('link', { name: FORM_CHILDREN_COPY.edit })[0],
      ).toHaveAttribute('href', '/fragments/child-1');
      expect(
        component.getByRole('link', { name: FORM_CHILDREN_COPY.add }),
      ).toHaveAttribute('href', '/#grid-1-add-child');
      expect(component.getByTestId('FragmentChildAdd')).toHaveAttribute(
        'id',
        'grid-1-add-child',
      );
    });

    test('posts removeChild for a removed child', async () => {
      const { component, submitted } = renderEditor(
        MOCK_CONTAINER_EDITOR_RECORDS,
      );

      const [firstRemove] = component.getAllByRole('button', {
        name: FORM_CHILDREN_COPY.remove,
      });

      if (!firstRemove) throw new Error('no remove button');
      await userEvent.click(firstRemove);

      await waitFor(() => {
        expect(submitted).toHaveLength(1);
      });
      expect(submitted[0]?.get('intent')).toBe(FRAGMENT_INTENT.REMOVE_CHILD);
      expect(submitted[0]?.get('childUuid')).toBe('child-1');
    });
  });
});
