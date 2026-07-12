import { describe, expect, test } from 'vitest';

import {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
} from '../extract-frontmatter-body.js';
import { parseYamlFrontmatter } from '../parse-yaml-frontmatter.js';

describe('extractFrontmatterBody', () => {
  test('returns the body between the opening and closing delimiters', () => {
    const content = `---
name: my-skill
description: A summary.
---

Body content.
`;

    expect(extractFrontmatterBody(content)).toBe(
      '\nname: my-skill\ndescription: A summary.',
    );
  });

  test('returns null when content does not start with a delimiter', () => {
    expect(extractFrontmatterBody('# Title\n\nNo frontmatter here.\n')).toBe(
      null,
    );
  });

  test('tolerates leading whitespace before the opening delimiter', () => {
    const content = `

---
name: padded
---

Body.
`;

    expect(extractFrontmatterBody(content)).toBe('\nname: padded');
  });

  test('returns null for an unterminated block (opens but never closes)', () => {
    const content = `---
name: dangling
description: Never closed.
`;

    expect(extractFrontmatterBody(content)).toBe(null);
  });

  test('returns an empty body for an empty --- / --- block', () => {
    expect(extractFrontmatterBody('---\n---\n')).toBe('');
  });

  test('handles a closing delimiter at end-of-file with no trailing newline', () => {
    expect(extractFrontmatterBody('---\nname: tight\n---')).toBe(
      '\nname: tight',
    );
  });

  test('handles CRLF line endings', () => {
    const content = '---\r\nname: crlf\r\ndescription: Windows.\r\n---\r\nBody';

    expect(extractFrontmatterBody(content)).toBe(
      '\r\nname: crlf\r\ndescription: Windows.',
    );
  });
});

describe('extractContentAfterFrontmatter', () => {
  test('returns the body after a well-formed closing delimiter', () => {
    const content = `---
name: my-skill
---

Body content.
`;

    expect(extractContentAfterFrontmatter(content)).toBe('\nBody content.\n');
  });

  test('returns the original content verbatim when there is no frontmatter', () => {
    const content = '# Title\n\nNo frontmatter here.\n';

    expect(extractContentAfterFrontmatter(content)).toBe(content);
  });

  test('returns null for an unterminated block (malformed, do not trust)', () => {
    const content = `---
name: dangling
description: Never closed.
`;

    expect(extractContentAfterFrontmatter(content)).toBe(null);
  });

  test('returns an empty string when the closing delimiter ends the file', () => {
    expect(extractContentAfterFrontmatter('---\nname: tight\n---')).toBe('');
  });

  test('returns an empty string for an empty --- / --- block with no body', () => {
    expect(extractContentAfterFrontmatter('---\n---\n')).toBe('');
  });

  test('handles CRLF line endings around the closing delimiter', () => {
    const content = '---\r\nname: crlf\r\n---\r\nBody after.';

    expect(extractContentAfterFrontmatter(content)).toBe('Body after.');
  });
});

describe('parseYamlFrontmatter malformed-frontmatter robustness', () => {
  test('treats an unterminated block as having no frontmatter fields', () => {
    const content = `---
name: dangling
description: Never closed.
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({});
  });

  test('yields no fields for an empty --- / --- block', () => {
    expect(parseYamlFrontmatter('---\n---\n').fields).toEqual({});
  });

  test('parses keys across CRLF line endings', () => {
    const content = '---\r\nname: crlf\r\ndescription: Windows.\r\n---\r\n';

    expect(parseYamlFrontmatter(content).fields).toEqual({
      description: 'Windows.',
      name: 'crlf',
    });
  });

  test('strips a trailing comment from a plain scalar (real YAML semantics)', () => {
    // Unlike the retired regex parser, a real YAML comment (` #...`) after a
    // plain scalar is now stripped rather than kept as literal text.
    const content = `---
name: commented # inline comment is now a real comment
---
`;

    expect(parseYamlFrontmatter(content).fields.name).toBe('commented');
  });

  test('uses last-wins for duplicate keys', () => {
    const content = `---
name: first
name: second
---
`;

    expect(parseYamlFrontmatter(content).fields.name).toBe('second');
  });

  test('treats a tab-indented block scalar continuation as malformed YAML', () => {
    // Real YAML forbids tabs for indentation inside a block scalar; the `yaml`
    // package throws on this input, and a genuine parse error yields no
    // fields at all (the same "malformed, do not trust this file" outcome as
    // an unterminated frontmatter block), rather than the retired parser's
    // narrower per-field empty-string mishandling.
    const content = '---\ndescription: >-\n\tTab indented line.\n---\n';

    expect(parseYamlFrontmatter(content).fields).toEqual({});
  });

  test('tolerates a leading BOM before the opening delimiter', () => {
    // U+FEFF is whitespace to trimStart, so it is stripped and the opening
    // `---` is still recognized.
    const content = '﻿---\nname: bom\n---\n';

    expect(parseYamlFrontmatter(content).fields).toEqual({ name: 'bom' });
  });
});
