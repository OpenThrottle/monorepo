import { chatContextMeterAtom } from '@openthrottle/react-router-chat-state';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

import { AppearanceContextMeterField } from '../AppearanceContextMeterField';

type Store = ReturnType<typeof createStore>;

const renderField = (
  initial: boolean,
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(chatContextMeterAtom, initial);

  const component = render(
    <Provider store={store}>
      <AppearanceContextMeterField />
    </Provider>,
  );

  return { component, store };
};

describe('AppearanceContextMeterField Component', () => {
  test('is off by default and opts in on toggle', async () => {
    const user = userEvent.setup();
    const { component, store } = renderField(false);
    const toggle = component.getByRole('switch', {
      name: APPEARANCE_COPY.contextMeterLabel,
    });

    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);

    expect(store.get(chatContextMeterAtom)).toBe(true);
  });

  test('reflects a persisted opt-in and turns it off', async () => {
    const user = userEvent.setup();
    const { component, store } = renderField(true);
    const toggle = component.getByRole('switch', {
      name: APPEARANCE_COPY.contextMeterLabel,
    });

    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.click(toggle);

    expect(store.get(chatContextMeterAtom)).toBe(false);
  });
});
