import { describe, expect, it } from 'vitest';

import type { ConversationAttachment } from '../../types/conversation-backend.ts';
import {
  attachmentPaths,
  attachmentsPreamble,
  withAttachments,
} from '../attachments.ts';

const attachment = (path: string): ConversationAttachment => {
  return { mimeType: 'image/png', path, sha256: 'a'.repeat(64) };
};

describe('attachmentPaths', () => {
  it('is empty for undefined or an empty list', () => {
    expect(attachmentPaths(undefined)).toEqual([]);
    expect(attachmentPaths([])).toEqual([]);
  });

  it('dedupes in first-seen order', () => {
    expect(
      attachmentPaths([
        attachment('/att/a.png'),
        attachment('/att/b.png'),
        attachment('/att/a.png'),
      ]),
    ).toEqual(['/att/a.png', '/att/b.png']);
  });
});

describe('attachmentsPreamble', () => {
  it('returns empty when there is nothing to inject', () => {
    expect(attachmentsPreamble(undefined)).toBe('');
    expect(attachmentsPreamble([])).toBe('');
  });

  it('lists absolute paths and points the agent at its Read tool', () => {
    const preamble = attachmentsPreamble([
      attachment('/att/a.png'),
      attachment('/att/b.png'),
    ]);

    expect(preamble).toContain('Read tool');
    expect(preamble.split('\n').slice(1)).toEqual([
      '- /att/a.png',
      '- /att/b.png',
    ]);
  });
});

describe('withAttachments', () => {
  it('returns the prompt unchanged without attachments', () => {
    expect(withAttachments('hi', undefined)).toBe('hi');
  });

  it('prepends the preamble separated by a blank line', () => {
    const prompt = withAttachments('hi', [attachment('/att/a.png')]);

    expect(prompt.startsWith('The user attached these images')).toBe(true);
    expect(prompt.endsWith('- /att/a.png\n\nhi')).toBe(true);
  });
});
