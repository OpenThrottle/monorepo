import * as React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

/**
 * EditorWindow wraps `@monaco-editor/react`, which cannot run under jsdom.
 * Each test dynamically imports the component after registering its own
 * `vi.doMock` calls for `IS_BROWSER` and the Monaco module, then resets the
 * module registry afterwards so the next test starts from a clean mock —
 * following the same dynamic-import pattern as `Editor.ssr.test.tsx`.
 */
describe('EditorWindow Component', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  test('renders null and never reaches Monaco when not in a browser', async () => {
    vi.doMock('@openthrottle/react-router-utils', () => ({
      IS_BROWSER: false,
    }));
    vi.doMock('@monaco-editor/react', () => ({
      default: () => <div data-testid="MonacoEditor" />,
    }));

    const { EditorWindow } = await import('../EditorWindow');
    const component = render(<EditorWindow />);

    expect(component.container.firstChild).toBeNull();
    expect(component.queryByTestId('MonacoEditor')).toBeNull();
  });

  test('renders Monaco with the merged default options in a browser', async () => {
    const monacoMock = vi.fn<(props: Record<string, unknown>) => void>();

    vi.doMock('@openthrottle/react-router-utils', () => ({
      IS_BROWSER: true,
    }));
    vi.doMock('@monaco-editor/react', () => ({
      default: (props: Record<string, unknown>) => {
        monacoMock(props);
        return <div data-testid="MonacoEditor" />;
      },
    }));

    const { EditorWindow } = await import('../EditorWindow');
    const component = render(
      <EditorWindow className="editor" path="a.md" value="# hi" />,
    );

    expect(component.getByTestId('MonacoEditor')).not.toBeNull();
    expect(monacoMock).toHaveBeenCalledTimes(1);

    const [props] = monacoMock.mock.calls[0] ?? [];
    if (!props) {
      throw new Error('expected Monaco to have been rendered with props');
    }
    expect(props.className).toBe('editor');
    expect(props.path).toBe('a.md');
    expect(props.value).toBe('# hi');
    expect(props.theme).toBe('vs-dark');
    expect(props.options).toEqual({
      fontSize: 14,
      language: 'markdown',
      lineNumbers: 'on',
      minimap: { enabled: false },
      tabSize: 2,
      theme: 'vs-dark',
      wordWrap: 'on',
    });
  });

  test('forwards beforeMount/onMount and lets custom options override the defaults', async () => {
    const monacoMock = vi.fn<(props: Record<string, unknown>) => void>();
    const beforeMount = vi.fn();
    const onMount = vi.fn();

    vi.doMock('@openthrottle/react-router-utils', () => ({
      IS_BROWSER: true,
    }));
    vi.doMock('@monaco-editor/react', () => ({
      default: (props: Record<string, unknown>) => {
        monacoMock(props);
        return <div data-testid="MonacoEditor" />;
      },
    }));

    const { EditorWindow } = await import('../EditorWindow');
    render(
      <EditorWindow
        beforeMount={beforeMount}
        onMount={onMount}
        options={{ fontSize: 20 }}
      />,
    );

    const [props] = monacoMock.mock.calls[0] ?? [];
    if (!props) {
      throw new Error('expected Monaco to have been rendered with props');
    }
    expect(props.beforeMount).toBe(beforeMount);
    expect(props.onMount).toBe(onMount);
    expect(props.options).toEqual(
      expect.objectContaining({ fontSize: 20, tabSize: 2 }),
    );
  });
});
