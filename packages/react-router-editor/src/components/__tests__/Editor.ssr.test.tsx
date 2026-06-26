import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

/**
 * Locks in the SSR-safety contract: when rendered outside a browser
 * (`IS_BROWSER === false`), both `Editor` and `EditorWindow` short-circuit to
 * `null` rather than touching Monaco, which is browser-only.
 */
vi.mock('@openthrottle/react-router-utils', () => ({
  IS_BROWSER: false,
}));

// Monaco must never be reached in the non-browser path; render a marker so a
// regression that drops the short-circuit surfaces as a visible node.
vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco" />,
}));

describe('components SSR safety', () => {
  test('Editor renders null when IS_BROWSER is false', async () => {
    const { Editor } = await import('../Editor');
    const { container } = render(<Editor />);

    expect(container.firstChild).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  test('EditorWindow renders null when IS_BROWSER is false', async () => {
    const { EditorWindow } = await import('../EditorWindow');
    const { container, queryByTestId } = render(<EditorWindow />);

    expect(container.firstChild).toBeNull();
    expect(queryByTestId('monaco')).toBeNull();
  });
});
