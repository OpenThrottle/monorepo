import { describe, expect, test } from 'vitest';

import {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
  parseYamlFrontmatter,
  splitFrontmatter,
} from '../frontmatter.js';

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

describe('parseYamlFrontmatter scalars', () => {
  test('parses string, boolean, and quoted scalars', () => {
    const content = `---
name: my-skill
description: "A double-quoted summary."
disable-model-invocation: true
alwaysApply: false
label: 'A single-quoted summary.'
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({
      alwaysApply: false,
      description: 'A double-quoted summary.',
      'disable-model-invocation': true,
      label: 'A single-quoted summary.',
      name: 'my-skill',
    });
  });

  test('parses folded (>-) and literal (|-) block scalars', () => {
    const content = `---
folded: >-
  First line.
  Second line.
literal: |-
  Line one.
  Line two.
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({
      folded: 'First line. Second line.',
      literal: 'Line one.\nLine two.',
    });
  });

  test('coerces a bare unquoted number to a string', () => {
    expect(parseYamlFrontmatter('---\nversion: 42\n---\n').fields).toEqual({
      version: '42',
    });
  });

  test('omits a key with no value (bare colon) rather than an empty string', () => {
    const content = `---
description:
globs:
alwaysApply: true
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({
      alwaysApply: true,
    });
  });

  test('omits a key with an explicit null value', () => {
    expect(
      parseYamlFrontmatter('---\ndescription: null\n---\n').fields,
    ).toEqual({});
  });
});

describe('parseYamlFrontmatter array support', () => {
  test('parses a flow sequence of strings', () => {
    const content = '---\ntags: [github, git, terraform]\n---\n';

    expect(parseYamlFrontmatter(content).fields).toEqual({
      tags: ['github', 'git', 'terraform'],
    });
  });

  test('parses a block sequence of strings', () => {
    const content = `---
tags:
  - github
  - git
  - terraform
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({
      tags: ['github', 'git', 'terraform'],
    });
  });

  test('parses an empty flow sequence', () => {
    expect(parseYamlFrontmatter('---\ntags: []\n---\n').fields).toEqual({
      tags: [],
    });
  });

  test('stringifies non-string scalar items within a sequence', () => {
    const content = '---\nversions: [1, true, false]\n---\n';

    expect(parseYamlFrontmatter(content).fields).toEqual({
      versions: ['1', 'true', 'false'],
    });
  });
});

describe('parseYamlFrontmatter unsupported-construct guard', () => {
  test('normalizes a nested map value to an empty string', () => {
    const content = `---
metadata:
  version: '1.0'
name: has-metadata
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({
      metadata: '',
      name: 'has-metadata',
    });
  });

  test('normalizes a flow map value to an empty string', () => {
    expect(
      parseYamlFrontmatter('---\nmetadata: { version: 1 }\n---\n').fields,
    ).toEqual({ metadata: '' });
  });

  test('normalizes a sequence containing a nested map to an empty string', () => {
    const content = `---
tags:
  - github
  - key: value
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({ tags: '' });
  });

  test('normalizes a sequence containing a nested sequence to an empty string', () => {
    const content = `---
tags:
  - - nested
  - github
---
`;

    expect(parseYamlFrontmatter(content).fields).toEqual({ tags: '' });
  });

  test('yields no fields when the document root is not a mapping', () => {
    expect(parseYamlFrontmatter('---\njust a string\n---\n').fields).toEqual(
      {},
    );
    expect(parseYamlFrontmatter('---\n- a\n- b\n---\n').fields).toEqual({});
  });
});

describe('splitFrontmatter', () => {
  test('strips well-formed frontmatter and parses its fields', () => {
    const content = `---
name: my-skill
description: A summary.
---

Body content.
`;

    const result = splitFrontmatter(content);

    expect(result.content).toBe('\nBody content.\n');
    expect(result.content.includes('---')).toBe(false);
    expect(result.metadata).toEqual({
      description: 'A summary.',
      name: 'my-skill',
    });
    // rawSkill echoes the untouched input (frontmatter block included).
    expect(result.rawSkill).toBe(content);
  });

  test('returns the original input and empty metadata when no frontmatter', () => {
    const content = '# Title\n\nNo frontmatter here.\n';

    const result = splitFrontmatter(content);

    expect(result.content).toBe(content);
    expect(result.metadata).toEqual({});
    expect(result.rawSkill).toBe(content);
  });

  test('treats malformed (unterminated) frontmatter as no frontmatter', () => {
    const content = `---
name: my-skill
description: never closed

Body content that is really still inside the block.
`;

    const result = splitFrontmatter(content);

    expect(result.content).toBe(content);
    expect(result.metadata).toEqual({});
    expect(result.rawSkill).toBe(content);
  });

  test('yields empty content when the body after frontmatter is empty', () => {
    const content = `---
name: my-skill
---
`;

    const result = splitFrontmatter(content);

    expect(result.content).toBe('');
    expect(result.metadata).toEqual({ name: 'my-skill' });
  });

  test('flows scalar, boolean, and sequence fields through the parser', () => {
    const content = `---
name: my-skill
enabled: true
tags: [alpha, beta]
---

Body.
`;

    const result = splitFrontmatter(content);

    expect(result.metadata).toEqual({
      enabled: true,
      name: 'my-skill',
      tags: ['alpha', 'beta'],
    });
  });

  test('handles a realistic create-cli-style header', () => {
    const content = `---
name: create-cli
description: 'CLI UX/spec: args, flags, help, output, errors, config, dry-run.'
---

# Create CLI

First body line.
`;

    const result = splitFrontmatter(content);

    expect(result.metadata.name).toBe('create-cli');
    expect(result.metadata.description).toBe(
      'CLI UX/spec: args, flags, help, output, errors, config, dry-run.',
    );
    expect(result.content.startsWith('\n# Create CLI')).toBe(true);
    expect(result.content.includes('name: create-cli')).toBe(false);
  });
});
