import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { FormWysiwyg } from '../FormWysiwyg';

const renderField = (draft: Readonly<Record<string, unknown>>) => {
  const store = createStore();
  store.set(atomFragmentDraft, draft);
  const component = render(
    <Provider store={store}>
      <FormWysiwyg
        className={undefined}
        disabled={false}
        hideLabel={false}
        name="copy"
        schema={MOCK_FORM_SCHEMA}
      />
    </Provider>,
  );

  return { component, store };
};

describe('FormWysiwyg', () => {
  test('edits the HTML source in the draft', async () => {
    const { component, store } = renderField({});

    await userEvent.type(
      component.getByRole('textbox', { name: 'copy' }),
      '<p>Hi</p>',
    );

    expect(store.get(atomFragmentDraft)).toStrictEqual({ copy: '<p>Hi</p>' });
  });
});
