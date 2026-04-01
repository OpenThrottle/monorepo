import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import type { UseNotificationsStoreOptionalOptions } from '../useNotificationsStoreOptional';
import { useNotificationsStoreOptional } from '../useNotificationsStoreOptional';

describe('useNotificationsStoreOptional', () => {
  let options: UseNotificationsStoreOptionalOptions;

  beforeEach(async () => {
    options = {};

    const { result: _result } = renderHook(() =>
      useNotificationsStoreOptional(options),
    );

    // await act(async () => {
    //   result.current.actions.signOut();
    // });
  });

  test('FIXME: should be defined', () => {
    expect(useNotificationsStoreOptional).toBeDefined();
  });
});
