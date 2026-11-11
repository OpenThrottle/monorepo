import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import { MOCK_FORM_SCHEMA } from '../../data/mock.form-schema';
import { useFormField } from '../useFormField';

const renderField = (label: string) => {
  const store = createStore();
  store.set(atomFragmentDraft, { title: 'Hello' });
  const wrapper = (props: { readonly children: React.ReactNode }) => {
    return <Provider store={store}>{props.children}</Provider>;
  };
  const hook = renderHook(
    () => useFormField({ label, schema: MOCK_FORM_SCHEMA }),
    {
      wrapper,
    },
  );

  return { hook, store };
};

describe('useFormField', () => {
  test('reads the draft value and what the schema says about it', () => {
    const { hook } = renderField('title');

    expect(hook.result.current.value).toBe('Hello');
    expect(hook.result.current.isRequired).toBe(true);
    expect(hook.result.current.description).toBe('The heading');
  });

  test('treats an unlisted property as optional', () => {
    const { hook } = renderField('count');

    expect(hook.result.current.isRequired).toBe(false);
    expect(hook.result.current.value).toBeUndefined();
  });

  test('writes the value back into the draft', () => {
    const { hook, store } = renderField('count');

    act(() => {
      hook.result.current.setValue(3);
    });

    expect(store.get(atomFragmentDraft)).toStrictEqual({
      count: 3,
      title: 'Hello',
    });
  });
});
