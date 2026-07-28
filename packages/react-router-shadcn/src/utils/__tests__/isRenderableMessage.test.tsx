import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { isRenderableMessage } from '../isRenderableMessage';

describe('isRenderableMessage', () => {
  it('accepts non-whitespace strings', () => {
    expect(isRenderableMessage('Saved.')).toBe(true);
    expect(isRenderableMessage(' non-blank ')).toBe(true);
    expect(isRenderableMessage('0')).toBe(true);
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(isRenderableMessage('')).toBe(false);
    expect(isRenderableMessage('   ')).toBe(false);
    expect(isRenderableMessage('\n\t')).toBe(false);
  });

  it('accepts numeric values React will print', () => {
    expect(isRenderableMessage(0)).toBe(true);
    expect(isRenderableMessage(42)).toBe(true);
    expect(isRenderableMessage(-1)).toBe(true);
    expect(isRenderableMessage(10n)).toBe(true);
  });

  it('accepts valid React elements', () => {
    expect(isRenderableMessage(<span>Rich content</span>)).toBe(true);
    expect(isRenderableMessage(<>Fragment content</>)).toBe(true);
  });

  it('rejects nullish, boolean, and other non-renderable values', () => {
    expect(isRenderableMessage(null)).toBe(false);
    expect(isRenderableMessage(undefined)).toBe(false);
    expect(isRenderableMessage(false)).toBe(false);
    expect(isRenderableMessage(true)).toBe(false);
    expect(isRenderableMessage({})).toBe(false);
    expect(isRenderableMessage(() => 'x')).toBe(false);
    expect(isRenderableMessage(Symbol('s'))).toBe(false);
  });
});
