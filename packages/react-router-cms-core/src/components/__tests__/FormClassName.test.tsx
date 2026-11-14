import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormClassName } from '../FormClassName';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormClassName
        className={undefined}
        disabled={false}
        hideLabel={false}
        name="className"
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormClassName', () => {
  test('writes typed classes into the draft', async () => {
    const { component, store } = renderField({ className: 'p-4' });

    await userEvent.type(
      component.getByRole('textbox', { name: 'className' }),
      ' m-2',
    );

    expect(store.get(atomFragmentDraft)).toStrictEqual({
      className: 'p-4 m-2',
    });
  });

  test('shows no warning when every class is safelisted', () => {
    const { component } = renderField({ className: 'p-4 bg-primary' });

    expect(
      component.queryByTestId('form-class-name-unsupported'),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('textbox', { name: 'className' }),
    ).not.toHaveAttribute('aria-describedby');
  });

  test('lists classes outside the safelist under the input', async () => {
    const { component } = renderField({ className: 'p-4' });
    const input = component.getByRole('textbox', { name: 'className' });

    await userEvent.type(input, ' p-5 bg-primary/20');

    const warning = component.getByTestId('form-class-name-unsupported');
    expect(warning).toHaveTextContent('p-5 bg-primary/20');
    expect(warning).not.toHaveTextContent('p-4 ');
    expect(input).toHaveAttribute('aria-describedby', warning.id);
  });
});
