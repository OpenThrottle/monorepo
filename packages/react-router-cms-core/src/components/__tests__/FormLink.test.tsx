import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormLink } from '../FormLink';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormLink
        className={undefined}
        disabled={false}
        label="href"
        parent={false}
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormLink', () => {
  test('uses the description as its placeholder', () => {
    const { component } = renderField({});

    expect(component.getByRole('textbox', { name: 'href' })).toHaveAttribute(
      'placeholder',
      'Where it goes',
    );
  });

  test('writes the typed URL into the draft', async () => {
    const { component, store } = renderField({});

    await userEvent.type(
      component.getByRole('textbox', { name: 'href' }),
      '/about',
    );

    expect(store.get(atomFragmentDraft)).toStrictEqual({ href: '/about' });
  });
});
