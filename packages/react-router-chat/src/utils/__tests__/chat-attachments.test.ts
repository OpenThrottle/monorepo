import { describe, expect, test } from 'vitest';

import { getChatAttachmentSrc, pickImageFiles } from '../chat-attachments';

describe('getChatAttachmentSrc', () => {
  test('points at the attachments resource route', () => {
    expect(getChatAttachmentSrc('abc')).toBe('/resources/attachments/abc');
  });

  test('encodes the id', () => {
    expect(getChatAttachmentSrc('a/b')).toBe('/resources/attachments/a%2Fb');
  });
});

describe('pickImageFiles', () => {
  test('keeps image files only', () => {
    const image = new File(['x'], 'a.png', { type: 'image/png' });
    const other = new File(['x'], 'a.txt', { type: 'text/plain' });

    expect(pickImageFiles([other, image])).toEqual([image]);
  });
});
