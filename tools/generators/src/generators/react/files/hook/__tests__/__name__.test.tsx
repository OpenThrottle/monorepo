import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import type { <%= namePascal %>Options } from '../<%= name %>';
import { <%= name %> } from '../<%= name %>';

describe('<%= name %>', () => {
  let options: <%= namePascal %>Options;

  beforeEach(async () => {
    options = {};

    const { result } = renderHook(() => <%= name %>(options));

    // await act(async () => {
    //   result.current.actions.signOut();
    // });
  });

  test('FIXME: should be defined', () => {
    expect(<%= name %>).toBeDefined();
  });
});
