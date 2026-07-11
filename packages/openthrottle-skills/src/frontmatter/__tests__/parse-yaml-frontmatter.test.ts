import { describe, expect, test } from 'vitest';

import { parseYamlFrontmatter } from '../parse-yaml-frontmatter.js';

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
