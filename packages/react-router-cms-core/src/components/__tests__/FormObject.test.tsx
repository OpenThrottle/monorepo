import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormObject } from '../FormObject';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormObject
        className={undefined}
        disabled={false}
        hideLabel={false}
        name="meta"
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormObject', () => {
  test('shows the draft value as JSON', () => {
    const { component } = renderField({ meta: { a: 1 } });

    expect(component.getByRole('textbox', { name: 'meta' })).toHaveValue(
      '{\n  "a": 1\n}',
    );
  });

  test('stores parsed JSON', async () => {
    const { component, store } = renderField({});

    await userEvent.type(
      component.getByRole('textbox', { name: 'meta' }),
      '[[1]',
    );

    expect(store.get(atomFragmentDraft)).toStrictEqual({ meta: [1] });
  });

  test('flags invalid JSON and keeps the last valid value', async () => {
    const { component, store } = renderField({ meta: { a: 1 } });

    await userEvent.type(component.getByRole('textbox', { name: 'meta' }), 'x');

    expect(component.getByRole('alert')).toBeInTheDocument();
    expect(store.get(atomFragmentDraft)).toStrictEqual({ meta: { a: 1 } });
  });
});
