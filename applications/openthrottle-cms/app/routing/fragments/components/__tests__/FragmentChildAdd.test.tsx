import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import { MOCK_FRAGMENT_CHILD_PICKER } from '~/routing/fragments/data/mock.fragment-editor';
import type { FragmentChildPicker } from '~/routing/fragments/types/fragment-children';

import { FragmentChildAdd } from '../FragmentChildAdd';

const renderAdd = (picker: FragmentChildPicker, url = '/') => {
  const submitted: FormData[] = [];
  const Component = () => {
    const location = useLocation();

    return (
      <>
        <FragmentChildAdd
          className={undefined}
          id="add-child"
          picker={picker}
        />
        <output data-testid="search">{location.search}</output>
      </>
    );
  };
  const action = async (args: { readonly request: Request }) => {
    submitted.push(await args.request.formData());
    return null;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return {
    component: render(<RoutesStub initialEntries={[url]} />),
    submitted,
  };
};

describe('FragmentChildAdd', () => {
  describe('with candidates', () => {
    test('posts the chosen fragment with the addChild intent', async () => {
      const { component, submitted } = renderAdd(MOCK_FRAGMENT_CHILD_PICKER);

      await userEvent.click(
        component.getByRole('combobox', {
          name: FRAGMENT_EDITOR_COPY.addChildHeading,
        }),
      );
      await userEvent.click(component.getByRole('option', { name: /Intro/ }));
      await userEvent.click(
        component.getByRole('button', { name: FRAGMENT_EDITOR_COPY.addChild }),
      );

      await waitFor(() => {
        expect(submitted).toHaveLength(1);
      });
      expect(submitted[0]?.get('intent')).toBe(FRAGMENT_INTENT.ADD_CHILD);
      expect(submitted[0]?.get('childUuid')).toBe('child-1');
    });
  });

  describe('without candidates', () => {
    test('disables the picker and the button', () => {
      const { component } = renderAdd({
        ...MOCK_FRAGMENT_CHILD_PICKER,
        candidates: [],
      });

      expect(
        component.getByRole('button', { name: FRAGMENT_EDITOR_COPY.addChild }),
      ).toBeDisabled();
      expect(
        component.getByRole('combobox', {
          name: FRAGMENT_EDITOR_COPY.addChildHeading,
        }),
      ).toBeDisabled();
    });
  });

  describe('paging', () => {
    test('links to the next page, keeping the filter', () => {
      const { component } = renderAdd(
        { ...MOCK_FRAGMENT_CHILD_PICKER, typename: 'Heading' },
        '/?childTypename=Heading',
      );

      expect(
        component.getByRole('link', { name: FRAGMENT_EDITOR_COPY.nextPage }),
      ).toHaveAttribute('href', '/?childTypename=Heading&childPage=1');
      expect(
        component.queryByRole('link', {
          name: FRAGMENT_EDITOR_COPY.previousPage,
        }),
      ).toBeNull();
    });

    test('links back to the first page from page two', () => {
      const { component } = renderAdd(
        { ...MOCK_FRAGMENT_CHILD_PICKER, hasNextPage: false, page: 1 },
        '/?childPage=1',
      );

      expect(
        component.getByRole('link', {
          name: FRAGMENT_EDITOR_COPY.previousPage,
        }),
      ).toHaveAttribute('href', '/');
      expect(
        component.queryByRole('link', { name: FRAGMENT_EDITOR_COPY.nextPage }),
      ).toBeNull();
    });
  });

  describe('filtering', () => {
    test('navigates to the first page of the chosen typename', async () => {
      const { component } = renderAdd(
        { ...MOCK_FRAGMENT_CHILD_PICKER, page: 2 },
        '/?childPage=2',
      );

      await userEvent.click(
        component.getByRole('combobox', {
          name: FRAGMENT_EDITOR_COPY.filterChildrenLabel,
        }),
      );
      await userEvent.click(component.getByRole('option', { name: 'Button' }));

      await waitFor(() => {
        expect(component.getByTestId('search')).toHaveTextContent(
          '?childTypename=Button',
        );
      });
    });
  });
});
