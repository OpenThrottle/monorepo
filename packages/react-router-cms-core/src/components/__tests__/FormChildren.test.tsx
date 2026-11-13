import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { FORM_CHILDREN_COPY } from '../../data/data.copy';
import { MOCK_FRAGMENT_RECORDS } from '../../data/mock.fragment-records';
import type { CmsFragmentRecord } from '../../types/cms-records';
import { FormChildren } from '../FormChildren';

const getFragmentHref = (fragment: CmsFragmentRecord): string => {
  return `/edit/${fragment.uuid}`;
};

const renderChildren = (fragments: readonly CmsFragmentRecord[]) => {
  const onRemove = vi.fn();
  const onReorder = vi.fn();
  const Component = () => {
    return (
      <DndProvider backend={HTML5Backend}>
        <FormChildren
          addHref="/add"
          className={undefined}
          fragments={fragments}
          getFragmentHref={getFragmentHref}
          onDrop={undefined}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      </DndProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return { component: render(<RoutesStub />), onRemove, onReorder };
};

describe('FormChildren', () => {
  describe('with children', () => {
    test('lists each child by name, falling back to its typename', () => {
      const { component } = renderChildren(MOCK_FRAGMENT_RECORDS);
      const rows = component.getAllByRole('listitem');

      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent('Intro heading');
      expect(rows[1]).toHaveTextContent('Card');
    });

    test('links each child to the edit href the caller builds', () => {
      const { component } = renderChildren(MOCK_FRAGMENT_RECORDS);
      const links = component.getAllByRole('link', {
        name: FORM_CHILDREN_COPY.edit,
      });

      expect(links.map((link) => link.getAttribute('href'))).toStrictEqual([
        '/edit/child-1',
        '/edit/child-2',
        '/edit/child-3',
      ]);
    });

    test('reports which child to remove', async () => {
      const { component, onRemove } = renderChildren(MOCK_FRAGMENT_RECORDS);
      const [, second] = component.getAllByRole('button', {
        name: FORM_CHILDREN_COPY.remove,
      });

      if (second !== undefined) await userEvent.click(second);

      expect(onRemove).toHaveBeenCalledWith(MOCK_FRAGMENT_RECORDS[1]);
    });
  });

  describe('without children', () => {
    test('shows the empty state and the add link', () => {
      const { component } = renderChildren([]);

      expect(component.getByText(FORM_CHILDREN_COPY.empty)).toBeInTheDocument();
      expect(
        component.getByRole('link', { name: FORM_CHILDREN_COPY.add }),
      ).toHaveAttribute('href', '/add');
    });
  });
});
