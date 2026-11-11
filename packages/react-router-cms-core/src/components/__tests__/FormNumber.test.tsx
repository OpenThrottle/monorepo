import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormNumber } from '../FormNumber';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormNumber
        className={undefined}
        disabled={false}
        label="count"
        parent={false}
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormNumber', () => {
  test('stores numbers, not strings', async () => {
    const { component, store } = renderField({});

    await userEvent.type(
      component.getByRole('spinbutton', { name: 'count' }),
      '12',
    );

    expect(store.get(atomFragmentDraft)).toStrictEqual({ count: 12 });
  });

  test('clears the value when the input is emptied', async () => {
    const { component, store } = renderField({ count: 3 });

    await userEvent.clear(component.getByRole('spinbutton', { name: 'count' }));

    expect(store.get(atomFragmentDraft)).toStrictEqual({ count: undefined });
  });
});
