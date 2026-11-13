import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import type { FragmentChildCandidate } from '~/routing/fragments/types/fragment-children';

import { FragmentChildAdd } from '../FragmentChildAdd';

const CANDIDATES: readonly FragmentChildCandidate[] = [
  { name: 'Intro', typename: 'Heading', uuid: 'child-1' },
  { name: '', typename: 'Button', uuid: 'child-2' },
];

const renderAdd = (candidates: readonly FragmentChildCandidate[]) => {
  const submitted: FormData[] = [];
  const Component = () => {
    return (
      <FragmentChildAdd
        candidates={candidates}
        className={undefined}
        id="add-child"
      />
    );
  };
  const action = async (args: { readonly request: Request }) => {
    submitted.push(await args.request.formData());
    return null;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return { component: render(<RoutesStub />), submitted };
};

describe('FragmentChildAdd', () => {
  describe('with candidates', () => {
    test('posts the chosen fragment with the addChild intent', async () => {
      const { component, submitted } = renderAdd(CANDIDATES);

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
      const { component } = renderAdd([]);

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
});
