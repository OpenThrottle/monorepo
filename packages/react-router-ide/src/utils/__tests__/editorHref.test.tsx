import { describe, expect, test } from 'vitest';
import { editorHref } from '../editorHref';

describe('editorHref', () => {
  test('builds a vscode file link by default', () => {
    expect(editorHref({ absolutePath: '/abs/src/a.ts' })).toBe(
      'vscode://file/abs/src/a.ts',
    );
  });

  test('appends line and column when both are given', () => {
    expect(
      editorHref({ absolutePath: '/abs/src/a.ts', column: 4, line: 12 }),
    ).toBe('vscode://file/abs/src/a.ts:12:4');
  });

  test('omits the column when there is no line', () => {
    expect(editorHref({ absolutePath: '/abs/src/a.ts', column: 4 })).toBe(
      'vscode://file/abs/src/a.ts',
    );
  });

  test('honors a custom scheme', () => {
    expect(
      editorHref({ absolutePath: '/abs/a.ts', line: 3, scheme: 'cursor' }),
    ).toBe('cursor://file/abs/a.ts:3');
  });
});
