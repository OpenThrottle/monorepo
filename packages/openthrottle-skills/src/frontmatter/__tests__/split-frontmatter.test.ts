import { describe, expect, test } from 'vitest';

import { splitFrontmatter } from '../split-frontmatter.js';

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
