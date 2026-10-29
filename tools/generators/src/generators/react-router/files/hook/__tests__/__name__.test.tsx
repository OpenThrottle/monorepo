import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import type { <%= namePascal %>Options } from '../<%= name %>';
import { <%= name %> } from '../<%= name %>';

describe('<%= name %>', () => {
  let options: <%= namePascal %>Options;

  beforeEach(() => {
    options = {};
  });

  test('FIXME: returns a result', () => {
    const { result } = renderHook(() => <%= name %>(options));

    expect(result.current).toBeDefined();
  });
});
