// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { parsePersonaFrontmatter } from '~/routing/agents/data/parse-persona-frontmatter.server';

describe('parsePersonaFrontmatter (re-export)', () => {
  test('returns undefined fields when the file has no frontmatter block', () => {
    expect(
      parsePersonaFrontmatter('# Persona title\n\nBody without frontmatter.\n'),
    ).toEqual({
      description: undefined,
      name: undefined,
    });
  });

  test('parses inline name and description scalars', () => {
    expect(
      parsePersonaFrontmatter(`---
name: architect
description: Architecture lens.
---

# architect
`),
    ).toEqual({
      description: 'Architecture lens.',
      name: 'architect',
    });
  });

  test('trims whitespace-only values to undefined', () => {
    expect(
      parsePersonaFrontmatter(`---
name: "   "
description: Has a summary.
---
`),
    ).toEqual({
      description: 'Has a summary.',
      name: undefined,
    });
  });

  test('returns undefined fields when opening --- has no closing delimiter', () => {
    expect(parsePersonaFrontmatter('---\nname: orphan\n')).toEqual({
      description: undefined,
      name: undefined,
    });
  });
});
