import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

import { useIsHydrated } from '../useIsHydrated';

const Probe = (): React.ReactElement => {
  // Hooks
  const isHydrated = useIsHydrated();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <span>{isHydrated ? 'client' : 'server'}</span>;
};

describe('useIsHydrated', () => {
  test('is false when rendered on the server', () => {
    expect(renderToString(<Probe />)).toBe('<span>server</span>');
  });

  test('is true on the first render of a client-only mount', () => {
    const { result } = renderHook(() => {
      return useIsHydrated();
    });

    expect(result.current).toBe(true);
  });

  test('hydrates against the server markup, then flips to true', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Probe />);
    document.body.append(container);
    const onRecoverableError = vi.fn();

    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('client');
    container.remove();
  });
});
