import { describe, expect, it } from 'vitest';

import { isEditableTarget } from '../editable-target';

describe('isEditableTarget', () => {
  it.each(['input', 'select', 'textarea'])('is true for a <%s>', (tag) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(true);
  });

  it('is true for a contenteditable element', () => {
    const div = document.createElement('div');
    // jsdom does not compute `isContentEditable` from the attribute.
    Object.defineProperty(div, 'isContentEditable', { value: true });
    expect(isEditableTarget(div)).toBe(true);
  });

  it('is false for a plain element', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
  });

  it('is false for null and non-element targets', () => {
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(window)).toBe(false);
  });
});
