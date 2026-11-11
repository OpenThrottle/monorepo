import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormBoolean } from '../FormBoolean';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormBoolean
        className={undefined}
        disabled={false}
        label="secondary"
        parent={false}
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormBoolean', () => {
  test('reflects the draft value', () => {
    const { component } = renderField({ secondary: true });

    expect(component.getByRole('switch', { name: 'secondary' })).toBeChecked();
  });

  test('toggles the value in the draft', async () => {
    const { component, store } = renderField({});

    await userEvent.click(component.getByRole('switch', { name: 'secondary' }));

    expect(store.get(atomFragmentDraft)).toStrictEqual({ secondary: true });
  });
});
