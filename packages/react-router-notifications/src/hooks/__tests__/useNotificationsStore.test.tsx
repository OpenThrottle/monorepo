import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import type { UseNotificationsStoreOptions } from '../useNotificationsStore';
import { useNotificationsStore } from '../useNotificationsStore';

describe('useNotificationsStore', () => {
  let options: UseNotificationsStoreOptions;

  beforeEach(async () => {
    options = {};

    const { result: _result } = renderHook(() =>
      useNotificationsStore(options),
    );

    // await act(async () => {
    //   result.current.actions.signOut();
    // });
  });

  test('FIXME: should be defined', () => {
    expect(useNotificationsStore).toBeDefined();
  });
});
