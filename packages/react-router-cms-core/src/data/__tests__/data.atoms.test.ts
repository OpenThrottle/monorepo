import { createStore } from 'jotai';
import { describe, expect, test } from 'vitest';

import { CMS_DEVICE } from '../../config/cms-device';
import type { CmsFragment } from '../../types/cms-fragment';
import { atomFragment } from '../data.atom.fragment';
import { atomFragments } from '../data.atom.fragments';
import { atomSettings, atomSettingsDefault } from '../data.atom.settings';

const fragment: CmsFragment = {
  children: [],
  properties: { title: 'Hello' },
  typename: 'Hero',
  uuid: 'fragment-1',
};

describe('data/atomFragment', () => {
  test('starts with no selection', () => {
    expect(createStore().get(atomFragment)).toBeUndefined();
  });

  test('holds the selected fragment once set', () => {
    const store = createStore();
    store.set(atomFragment, fragment);
    expect(store.get(atomFragment)).toBe(fragment);
  });
});

describe('data/atomFragments', () => {
  test('starts empty', () => {
    expect(createStore().get(atomFragments)).toEqual([]);
  });

  test('holds the fragments once set', () => {
    const store = createStore();
    store.set(atomFragments, [fragment]);
    expect(store.get(atomFragments)).toEqual([fragment]);
  });
});

describe('data/atomSettings', () => {
  test('defaults to the desktop device with navigation open', () => {
    expect(createStore().get(atomSettings)).toEqual({
      device: CMS_DEVICE.DESKTOP,
      navigation: { open: true },
    });
  });

  test('accepts a new device and navigation state', () => {
    const store = createStore();
    store.set(atomSettings, {
      ...atomSettingsDefault,
      device: CMS_DEVICE.MOBILE,
      navigation: { open: false },
    });
    expect(store.get(atomSettings)).toEqual({
      device: CMS_DEVICE.MOBILE,
      navigation: { open: false },
    });
  });
});
