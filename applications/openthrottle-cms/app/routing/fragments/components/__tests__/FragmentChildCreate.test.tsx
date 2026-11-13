import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';

import { FragmentChildCreate } from '../FragmentChildCreate';

const renderCreate = (typenames: readonly string[]) => {
  const submitted: FormData[] = [];
  const Component = () => {
    return (
      <FragmentChildCreate
        className={undefined}
        id="create-child"
        typenames={typenames}
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

describe('FragmentChildCreate', () => {
  describe('with typenames', () => {
    test('posts the chosen type and name with the createChild intent', async () => {
      const { component, submitted } = renderCreate(['Button', 'Heading']);

      await userEvent.click(
        component.getByRole('combobox', {
          name: FRAGMENT_EDITOR_COPY.createChildHeading,
        }),
      );
      await userEvent.click(component.getByRole('option', { name: 'Heading' }));
      await userEvent.type(
        component.getByLabelText(FRAGMENT_EDITOR_COPY.createChildNameLabel),
        'Intro',
      );
      await userEvent.click(
        component.getByRole('button', {
          name: FRAGMENT_EDITOR_COPY.createChild,
        }),
      );

      await waitFor(() => {
        expect(submitted).toHaveLength(1);
      });
      expect(submitted[0]?.get('intent')).toBe(FRAGMENT_INTENT.CREATE_CHILD);
      expect(submitted[0]?.get('typename')).toBe('Heading');
      expect(submitted[0]?.get('name')).toBe('Intro');
    });
  });

  describe('without typenames', () => {
    test('disables the form', () => {
      const { component } = renderCreate([]);

      expect(
        component.getByRole('button', {
          name: FRAGMENT_EDITOR_COPY.createChild,
        }),
      ).toBeDisabled();
    });
  });
});
