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

// `Editor` composes these three, and none of them participates in the
// short-circuit under test — but importing them for real drags in the icon and
// state graph (`@phosphor-icons/react`, jotai atoms, the sidebar tree), which
// dominated this file's runtime. Stub them with visible markers so a regression
// that drops the short-circuit still surfaces as a rendered node.
const stub = (testId: string) => (): React.ReactElement => (
  <div data-testid={testId} />
);

vi.mock('../EditorSidebar', () => ({ EditorSidebar: stub('editor-sidebar') }));
vi.mock('../EditorTabs', () => ({ EditorTabs: stub('editor-tabs') }));
vi.mock('../EditorToolbar', () => ({ EditorToolbar: stub('editor-toolbar') }));

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
