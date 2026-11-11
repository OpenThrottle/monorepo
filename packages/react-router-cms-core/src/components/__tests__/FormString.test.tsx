import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormString } from '../FormString';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormString
        className={undefined}
        disabled={false}
        label="title"
        parent={false}
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormString', () => {
  test('shows the draft value and marks a required field', () => {
    const { component } = renderField({ title: 'Hello' });

    expect(component.getByRole('textbox', { name: 'title' })).toHaveValue(
      'Hello',
    );
    expect(component.getByRole('textbox', { name: 'title' })).toBeRequired();
    expect(component.getByText('The heading')).toBeInTheDocument();
  });

  test('writes typed text into the draft', async () => {
    const { component, store } = renderField({});

    await userEvent.type(
      component.getByRole('textbox', { name: 'title' }),
      'Hi',
    );

    expect(store.get(atomFragmentDraft)).toStrictEqual({ title: 'Hi' });
  });
});
