import { render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { FORM_FIELD_COPY } from '../../data/data.copy';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormAnyOf } from '../FormAnyOf';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormAnyOf
        className={undefined}
        disabled={false}
        label="choice"
        parent={false}
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormAnyOf', () => {
  test('lists the options it cannot edit yet', () => {
    const { component } = renderField({});

    expect(
      component.getByText(FORM_FIELD_COPY.anyOfUnsupported),
    ).toBeInTheDocument();
    expect(component.getByText('ButtonProps')).toBeInTheDocument();
    expect(component.getByText('string')).toBeInTheDocument();
  });
});
