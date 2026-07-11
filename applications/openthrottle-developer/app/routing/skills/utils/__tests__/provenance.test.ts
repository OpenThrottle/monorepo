import { describe, expect, test } from 'vitest';
import { describeProvenance } from '~/routing/skills/utils/provenance';

describe('describeProvenance', () => {
  test('maps the frontmatter tri-state rungs', () => {
    expect(describeProvenance('frontmatter:true')).toMatch(/frontmatter/i);
    expect(describeProvenance('frontmatter:true')).toMatch(/true/);
    expect(describeProvenance('frontmatter:false')).toMatch(/false/);
    expect(describeProvenance('frontmatter:unset')).toMatch(/unset/i);
  });

  test('maps the deny posture rung', () => {
    expect(describeProvenance('posture:deny')).toMatch(/deny posture/i);
  });

  test('maps slug allow/deny exceptions', () => {
    expect(describeProvenance('slug-allow:git-commit@rule-1')).toMatch(
      /allowed by a slug/i,
    );
    expect(describeProvenance('slug-deny:git-commit@rule-1')).toMatch(
      /denied by a slug/i,
    );
  });

  test('maps tag allow/deny rungs and surfaces the tag name', () => {
    expect(describeProvenance('tag-allow:github@rule-2')).toMatch(
      /allowed by a tag rule \(github\)/i,
    );
    expect(describeProvenance('tag-deny:infra@rule-3')).toMatch(
      /denied by a tag rule \(infra\)/i,
    );
  });

  test('falls back to the raw string for an unknown shape', () => {
    expect(describeProvenance('mystery:value')).toBe('mystery:value');
  });
});
