import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { FORM_FIELD_COPY } from '../../data/data.copy';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormArray } from '../FormArray';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormArray
        className={undefined}
        disabled={false}
        hideLabel={false}
        name="images"
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormArray', () => {
  test('shows the empty state', () => {
    const { component } = renderField({});

    expect(component.getByText(FORM_FIELD_COPY.arrayEmpty)).toBeInTheDocument();
  });

  test('adds, edits and removes items', async () => {
    const { component, store } = renderField({ images: ['a.png'] });

    await userEvent.click(
      component.getByRole('button', { name: FORM_FIELD_COPY.arrayAdd }),
    );
    await userEvent.type(
      component.getByRole('textbox', { name: 'images 2' }),
      'b',
    );
    expect(store.get(atomFragmentDraft)).toStrictEqual({
      images: ['a.png', 'b'],
    });

    const [first] = component.getAllByRole('button', {
      name: FORM_FIELD_COPY.arrayRemove,
    });
    if (first !== undefined) await userEvent.click(first);

    expect(store.get(atomFragmentDraft)).toStrictEqual({ images: ['b'] });
  });
});
