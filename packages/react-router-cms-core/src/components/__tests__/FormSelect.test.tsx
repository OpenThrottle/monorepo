import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormSelect } from '../FormSelect';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormSelect
        className={undefined}
        disabled={false}
        hideLabel={false}
        name="size"
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormSelect', () => {
  test('shows the selected enum value', () => {
    const { component } = renderField({ size: 'md' });

    expect(component.getByRole('combobox', { name: 'size' })).toHaveTextContent(
      'md',
    );
  });

  test('writes the chosen option into the draft', async () => {
    const { component, store } = renderField({});

    await userEvent.click(component.getByRole('combobox', { name: 'size' }));
    await userEvent.click(component.getByRole('option', { name: 'lg' }));

    expect(store.get(atomFragmentDraft)).toStrictEqual({ size: 'lg' });
  });
});
