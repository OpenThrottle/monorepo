import { AGENT_ASSET_SLUG_PATTERN } from '@openthrottle/openthrottle-skills';
import { describe, expect, it } from 'vitest';
import { SKILL_CREATE_SLUG_PATTERN } from '~/routing/skills/config/skill-create';

describe('SKILL_CREATE_SLUG_PATTERN', () => {
  it('matches the package pattern it deliberately mirrors', () => {
    expect(SKILL_CREATE_SLUG_PATTERN.source).toBe(
      AGENT_ASSET_SLUG_PATTERN.source,
    );
    expect(SKILL_CREATE_SLUG_PATTERN.flags).toBe(
      AGENT_ASSET_SLUG_PATTERN.flags,
    );
  });
});
