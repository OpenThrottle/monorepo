import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test } from 'vitest';

import { useSkillsIndex } from '../useSkillsIndex';

const renderIndex = (url: string) => {
  const Wrapper = (props: { children: React.ReactNode }) => {
    const router = createMemoryRouter(
      [{ element: props.children, path: '/' }],
      {
        initialEntries: [url],
      },
    );

    return <RouterProvider router={router} />;
  };

  return renderHook(() => useSkillsIndex({ entries: [] }), {
    wrapper: Wrapper,
  });
};

describe('useSkillsIndex', () => {
  test('flags an unfiltered empty list as a new user', () => {
    const { result } = renderIndex('/');

    expect(result.current.isNewUser).toBe(true);
    expect(result.current.page).toBe(1);
  });

  test('treats an active search as filtered, not new', () => {
    const { result } = renderIndex('/?search=abc');

    expect(result.current.isFiltered).toBe(true);
    expect(result.current.isNewUser).toBe(false);
  });
});
